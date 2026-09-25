import crypto from "node:crypto";
import { requireGithubEnv } from "../github-integration.service";
export const ENCRYPTION_VERSION = "v1";
export function getEncryptionSecret() {
  return (
    process.env.GITHUB_TOKEN_ENCRYPTION_SECRET?.trim() || requireGithubEnv("GITHUB_CLIENT_SECRET")
  );
}

export function getEncryptionKey() {
  return crypto.scryptSync(getEncryptionSecret(), "vion-github-token", 32);
}

export function encryptGithubToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptGithubToken(payload: string | null | undefined) {
  if (!payload) {
    return null;
  }

  const [version, ivBase64, authTagBase64, encryptedBase64] = payload.split(".");

  if (version !== ENCRYPTION_VERSION || !ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Invalid encrypted GitHub token");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivBase64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
