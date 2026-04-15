/*
 * One-time Gmail OAuth refresh token bootstrap.
 *
 * Usage:
 *   npm run gmail:bootstrap
 *
 * This script:
 *   1. Starts a local HTTP server on http://localhost:53682
 *   2. Opens your browser to Google's consent screen for Gmail Send scope
 *   3. Catches the OAuth redirect, exchanges the code for tokens
 *   4. Prints the refresh token for you to paste into .env as GMAIL_REFRESH_TOKEN
 *
 * Run this on your local machine (not on EC2) while logged into the account
 * you want emails to be sent FROM (uiucbadm576@gmail.com).
 */

import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";
import "dotenv/config";

const REDIRECT_PORT = 53682;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;
const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
    process.exit(1);
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\n=== Gmail OAuth bootstrap ===");
  console.log("Open this URL in your browser (copy/paste):\n");
  console.log(authUrl);
  console.log("\nAfter you authorize, return here. The token will print below.");

  const refreshToken = await new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url) return;
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      if (error) {
        res
          .writeHead(400, { "Content-Type": "text/plain" })
          .end(`OAuth error: ${error}`);
        server.close();
        reject(new Error(error));
        return;
      }
      if (!code) {
        res.writeHead(400).end("Missing code");
        return;
      }
      try {
        const { tokens } = await oauth2.getToken(code);
        if (!tokens.refresh_token) {
          throw new Error(
            "No refresh token returned. Revoke access at https://myaccount.google.com/permissions and retry."
          );
        }
        res
          .writeHead(200, { "Content-Type": "text/html" })
          .end(
            "<h1>Success</h1><p>You can close this tab and return to the terminal.</p>"
          );
        server.close();
        resolve(tokens.refresh_token);
      } catch (e) {
        res
          .writeHead(500, { "Content-Type": "text/plain" })
          .end(`Error: ${(e as Error).message}`);
        server.close();
        reject(e);
      }
    });
    server.listen(REDIRECT_PORT);
  });

  console.log("\n=== Refresh token ===\n");
  console.log(refreshToken);
  console.log("\nPaste this into .env as GMAIL_REFRESH_TOKEN=...");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
