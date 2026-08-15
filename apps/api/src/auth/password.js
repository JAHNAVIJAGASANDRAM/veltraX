import argon2 from "argon2";

export async function hashPassword(password) {
  return argon2.hash(password);
}

export async function verifyPassword(passwordHash, password) {
  return argon2.verify(passwordHash, password);
}