import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const encodedKey = process.env.OAUTH_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error("OAUTH_ENCRYPTION_KEY is not configured");
  }

  let key;

  try {
    key = Buffer.from(encodedKey, "base64");
  } catch {
    throw new Error("OAUTH_ENCRYPTION_KEY is invalid");
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      "OAUTH_ENCRYPTION_KEY must decode to 32 bytes"
    );
  }

  return key;
}

export function encryptSecret(plaintext) {
  if (typeof plaintext !== "string" || !plaintext) {
    throw new TypeError("Secret must be a non-empty string");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64")
  ].join(".");
}

export function decryptSecret(encrypted) {
  if (typeof encrypted !== "string" || !encrypted) {
    throw new TypeError("Encrypted secret must be a non-empty string");
  }

  const parts = encrypted.split(".");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted secret format");
  }

  const [, ivEncoded, authTagEncoded, ciphertextEncoded] = parts;

  const key = getEncryptionKey();

  const iv = Buffer.from(ivEncoded, "base64");
  const authTag = Buffer.from(authTagEncoded, "base64");
  const ciphertext = Buffer.from(ciphertextEncoded, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid encrypted secret IV");
  }

  if (authTag.length !== 16) {
    throw new Error("Invalid encrypted secret authentication tag");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    iv
  );

  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}