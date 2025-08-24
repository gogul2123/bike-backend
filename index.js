import { google } from "googleapis";
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load OAuth credentials from credentials.json in the SAME directory
const credentialsPath = path.join(__dirname, "credential.json");

if (!fs.existsSync(credentialsPath)) {
  console.error(`Missing credential.json at ${credentialsPath}`);
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

const { client_id, client_secret, redirect_uris } = credentials.web;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0] // usually "http://localhost"
);

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

// Step 1: Generate Auth URL
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline", // important for refresh token
  prompt: "consent", // ensure refresh token is always returned
  scope: SCOPES,
});

console.log("Authorize this app by visiting this url:\n", authUrl);

// Step 2: Read authorization code from console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the code from that page here: ", async (code) => {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log("\nYour Refresh Token is:\n", tokens.refresh_token);
    rl.close();
  } catch (error) {
    console.error("Error retrieving refresh token:", error);
    rl.close();
  }
});
