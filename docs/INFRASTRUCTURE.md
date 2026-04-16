# Infrastructure — Horizon Hobby Competition Platform

AWS account: `233894722519` (us-east-2)

## Provisioned resources

| Resource | ID / Name | Notes |
|---|---|---|
| S3 bucket | `hh-comp-2026-files-use2` | Versioning on, SSE-AES256, public access blocked |
| IAM user (local dev) | `hh-comp-app` | Access key in `.secrets/iam-app-access-key.json`. Scoped to S3 bucket. |
| IAM role (EC2) | `hh-comp-ec2-role` | Trusted by ec2.amazonaws.com |
| IAM instance profile | `hh-comp-ec2-profile` | Attached to EC2; app reads S3 via IMDSv2 |
| EC2 instance | `i-03cf8d1f3a158d259` | **t3.large** (upgraded from t3.medium on 2026-04-15 after OOM during `docker compose build app`), Ubuntu 22.04, 30 GB gp3, termination protection ON, IMDSv2 required |
| SSH key pair | `hh-comp-key` (ed25519) | Private key at `.secrets/hh-comp-key.pem` |
| Security group | `sg-00bb0732bffbf5de3` | name `hh-comp-web`, ingress 22/80/443 from 0.0.0.0/0 |
| Default VPC | `vpc-04efdf2770a11e232` | — |
| Elastic IP | `eipalloc-0883e7ca5916ed3b6` | **Public IP: 16.59.203.133** |
| AMI | `ami-02eca7f977a9203af` | ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-20260410 |

## URLs

- **Public URL:** `https://16-59-203-133.sslip.io` (HTTPS via Let's Encrypt on sslip.io hostname)
- **App listens on:** `:80`, `:443` (nginx) → `:3000` (Next.js container) + `:8000` (grader)
- **SSH:** `ssh -i .secrets/hh-comp-key.pem ubuntu@16.59.203.133`

## User-data bootstrap (`.secrets/ec2-user-data.sh`)

On first boot the instance installs:
- Docker Engine + Compose plugin (from official Docker apt repo)
- `ufw` firewall (allow 22/80/443, deny all other incoming)
- `fail2ban`
- Creates `/opt/hh-comp` owned by `ubuntu`

Bootstrap completion marker: `/var/log/hh-bootstrap-done`

## Local secrets directory

`.secrets/` is gitignored. Contains:
- `hh-comp-key.pem` — EC2 SSH private key
- `iam-app-access-key.json` — local-dev IAM access key (scoped)
- `iam-policy-app.json` — S3 IAM policy document
- `ec2-trust-policy.json` — role trust policy
- `ec2-user-data.sh` — instance bootstrap script
- `instance-id.txt`, `eip-alloc-id.txt`, `public-ip.txt`, `sg-id.txt`, `vpc-id.txt`, `ami-id.txt`

## Operational notes

- **Termination protection is ON.** To terminate: `aws ec2 modify-instance-attribute --instance-id i-03cf8d1f3a158d259 --no-disable-api-termination && aws ec2 terminate-instances --instance-ids i-03cf8d1f3a158d259`
- **EIP billing:** free while attached to a running instance; ~$3.60/mo if detached. Don't stop the instance for long periods without releasing the EIP.
- **Deploy target:** `/opt/hh-comp` on the instance. `docker compose up -d` from there.
