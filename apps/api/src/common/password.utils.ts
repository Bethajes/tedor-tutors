import argon2 from 'argon2';

const TEST_MODE = process.env.NODE_ENV === 'test';

export function hashPassword(password: string): Promise<string> {
  if (TEST_MODE) {
    // Cheap parameters keep the test suite fast; production keeps Argon2id
    // defaults unless explicitly overridden via env.
    return argon2.hash(password, { type: argon2.argon2id, memoryCost: 2048, timeCost: 2, parallelism: 1 });
  }
  return argon2.hash(password, { type: argon2.argon2id });
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password).catch(() => false);
}