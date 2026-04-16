/*
 * Exchange a Google OAuth authorization code for a refresh token.
 *
 * Usage:
 *   1. Open this URL in your browser (sign in as uiucbadm576@gmail.com, click Allow):
 *
 *      https://accounts.google.com/o/oauth2/auth?access_type=offline&prompt=consent&response_type=code&client_id=222320687906-ka8canqq0gilcin6oge6tvj53t2uddfl.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A53682%2Foauth2callback&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send
 *
 *   2. Browser will redirect to http://localhost:53682/oauth2callback?code=XXXX&...
 *      The "Connection refused" error in the browser is fine — copy the `code` param from the URL.
 *
 *   3. Run this script with the code:
 *      npx tsx scripts/gmail-exchange-code.ts <code>
 *
 *   4. Paste the printed refresh token into /opt/hh-comp/.env on EC2 as GMAIL_REFRESH_TOKEN.
 */

import "dotenv/config";

async function main() {
  const code = process.argv[2];
  if (!code) {
    console.error("Usage: npx tsx scripts/gmail-exchange-code.ts <code>");
    console.error("Get the code from the URL after authorizing in the browser.");
    process.exit(1);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env");
    process.exit(1);
  }

  const params = new URLSearchParams();
  params.set("code", code);
  params.set("client_id", clientId);
  params.set("client_secret", clientSecret);
  params.set("redirect_uri", "http://localhost:53682/oauth2callback");
  params.set("grant_type", "authorization_code");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Exchange failed:", data);
    process.exit(1);
  }

  if (!data.refresh_token) {
    console.error(
      "\nNo refresh_token in response. This usually means you've already authorized this app."
    );
    console.error(
      "Revoke at https://myaccount.google.com/permissions and re-do the consent flow.\n"
    );
    console.error("Response:", data);
    process.exit(1);
  }

  console.log("\n=========================================");
  console.log("  GMAIL_REFRESH_TOKEN");
  console.log("=========================================\n");
  console.log(data.refresh_token);
  console.log("\n=========================================\n");
  console.log("Paste it into /opt/hh-comp/.env on EC2:");
  console.log(`  GMAIL_REFRESH_TOKEN=${data.refresh_token}`);
  console.log("\nThen restart the app: docker compose restart app\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
