"""
FastAPI grader service.

POST /grade
  body: {
    submission_s3_key: str,
    answer_key_s3_key: str,
    script_s3_key: str | null,  # optional admin-provided grading script
    shared_secret: str,
  }
  returns: { ok: bool, score?: float, stdout?: str, stderr?: str, error?: str }

The service downloads the three files from S3 (via instance profile or env creds),
runs the grading script in a subprocess with a timeout and reports the result.

Security model: the admin-uploaded grading script is trusted code (admin is trusted),
but we still run it with resource limits as defense in depth.
"""

import os
import sys
import json
import tempfile
import subprocess
import logging
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import ClientError
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("grader")

SHARED_SECRET = os.environ.get("GRADER_SHARED_SECRET", "")
S3_BUCKET = os.environ.get("S3_BUCKET", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-2")
TIMEOUT_SECONDS = int(os.environ.get("GRADE_TIMEOUT", "60"))
MEMORY_MB = int(os.environ.get("GRADE_MEMORY_MB", "512"))

app = FastAPI(title="hh-comp grader", version="1.0.0")
s3 = boto3.client("s3", region_name=AWS_REGION)


class GradeRequest(BaseModel):
    submission_s3_key: str
    answer_key_s3_key: str
    script_s3_key: Optional[str] = None
    shared_secret: str


class GradeResponse(BaseModel):
    ok: bool
    score: Optional[float] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: Optional[int] = None
    error: Optional[str] = None


DEFAULT_SCRIPT = r"""
# Default grading script: weighted MAPE over predicted vs actual attach rates
# Expected format: both files have columns [Part, Month, Value] or similar.
# Falls back to any numeric columns if that structure isn't present.
import sys, json
import pandas as pd
import numpy as np

def load(path):
    if path.lower().endswith('.csv'):
        return pd.read_csv(path)
    return pd.read_excel(path)

def numeric_cols(df):
    return [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]

def weighted_mape(y_true, y_pred, weights=None):
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mask = y_true != 0
    if not mask.any():
        return float('nan')
    if weights is None:
        weights = np.ones_like(y_true)
    weights = np.asarray(weights, dtype=float)[mask]
    errs = np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])
    return float(np.average(errs, weights=weights))

pred_path, actual_path = sys.argv[1], sys.argv[2]
pred = load(pred_path)
actual = load(actual_path)

# Try to match on Part + Month if possible
join_keys = [c for c in ['Part', 'Month'] if c in pred.columns and c in actual.columns]
if join_keys:
    merged = pred.merge(actual, on=join_keys, suffixes=('_pred', '_actual'))
    p_col = next((c for c in merged.columns if 'pred' in c.lower() and pd.api.types.is_numeric_dtype(merged[c])), None)
    a_col = next((c for c in merged.columns if 'actual' in c.lower() and pd.api.types.is_numeric_dtype(merged[c])), None)
    if p_col and a_col:
        score = weighted_mape(merged[a_col], merged[p_col])
        print(json.dumps({'score': score, 'n': len(merged), 'method': 'part_month_join'}))
        sys.exit(0)

# Fallback: align first numeric columns by index
p_num = numeric_cols(pred)
a_num = numeric_cols(actual)
if p_num and a_num:
    n = min(len(pred), len(actual))
    score = weighted_mape(actual[a_num[0]].iloc[:n], pred[p_num[0]].iloc[:n])
    print(json.dumps({'score': score, 'n': n, 'method': 'first_numeric_column'}))
    sys.exit(0)

print(json.dumps({'error': 'Could not identify numeric columns to compare.'}))
sys.exit(2)
"""


def download(key: str, dest: Path) -> None:
    try:
        s3.download_file(S3_BUCKET, key, str(dest))
    except ClientError as e:
        raise HTTPException(500, f"S3 download failed for {key}: {e}")


@app.get("/health")
def health():
    return {"ok": True, "bucket": S3_BUCKET, "region": AWS_REGION}


@app.post("/grade", response_model=GradeResponse)
def grade(req: GradeRequest):
    if not SHARED_SECRET or req.shared_secret != SHARED_SECRET:
        raise HTTPException(401, "Invalid shared secret")
    if not S3_BUCKET:
        raise HTTPException(500, "S3_BUCKET not configured")

    with tempfile.TemporaryDirectory(prefix="grade_", dir="/tmp") as tmpdir:
        workdir = Path(tmpdir)
        pred_path = workdir / "prediction.xlsx"
        actual_path = workdir / "answer.xlsx"
        script_path = workdir / "grade.py"

        download(req.submission_s3_key, pred_path)
        download(req.answer_key_s3_key, actual_path)
        if req.script_s3_key:
            download(req.script_s3_key, script_path)
        else:
            script_path.write_text(DEFAULT_SCRIPT)

        log.info("Grading %s against %s", req.submission_s3_key, req.answer_key_s3_key)

        try:
            proc = subprocess.run(
                [sys.executable, str(script_path), str(pred_path), str(actual_path)],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS,
                cwd=str(workdir),
                env={
                    "PATH": "/usr/local/bin:/usr/bin:/bin",
                    "HOME": str(workdir),
                    "TMPDIR": str(workdir),
                },
            )
        except subprocess.TimeoutExpired as e:
            return GradeResponse(
                ok=False,
                error=f"Grading script exceeded {TIMEOUT_SECONDS}s timeout",
                stdout=(e.stdout or b"").decode("utf-8", errors="replace")
                    if isinstance(e.stdout, (bytes, bytearray))
                    else (e.stdout or ""),
                stderr=(e.stderr or b"").decode("utf-8", errors="replace")
                    if isinstance(e.stderr, (bytes, bytearray))
                    else (e.stderr or ""),
            )

        if proc.returncode != 0:
            return GradeResponse(
                ok=False,
                error=f"Grading script exited with code {proc.returncode}",
                stdout=proc.stdout,
                stderr=proc.stderr,
                exit_code=proc.returncode,
            )

        # Parse last JSON line from stdout
        score = None
        for line in reversed(proc.stdout.strip().splitlines()):
            try:
                obj = json.loads(line)
                if isinstance(obj, dict) and "score" in obj:
                    score = float(obj["score"])
                    break
            except json.JSONDecodeError:
                continue

        if score is None:
            return GradeResponse(
                ok=False,
                error="Grading script did not emit a JSON score.",
                stdout=proc.stdout,
                stderr=proc.stderr,
                exit_code=proc.returncode,
            )

        return GradeResponse(
            ok=True,
            score=score,
            stdout=proc.stdout,
            stderr=proc.stderr,
            exit_code=proc.returncode,
        )
