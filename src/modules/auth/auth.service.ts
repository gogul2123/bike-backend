import { OAuth2Client } from "google-auth-library";
import credentials from '../../credentials/credential.json' with { type: 'json' };

const { client_id } = credentials.web;
const client = new OAuth2Client(client_id);

interface GoogleUser {
  sub: string; // Google's unique ID
  name: string;
  email: string;
  picture?: string;
  email_verified: boolean;
}

export async function decodeGoogleToken(idToken: string): Promise<GoogleUser> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: client_id,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error("Invalid token payload");
    }

    return {
      sub: payload.sub,
      name: payload.name || "",
      email: payload.email || "",
      picture: payload.picture,
      email_verified: payload.email_verified || false,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    throw new Error("Authentication failed");
  }
}
