import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function encryptProjectCode(value: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptProjectCode(payload: string, secret: string) {
  const [ivText, authTagText, encryptedText] = payload.split(".");

  if (!ivText || !authTagText || !encryptedText) {
    return payload;
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(secret),
    Buffer.from(ivText, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagText, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
