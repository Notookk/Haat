import bcrypt from 'bcryptjs';
import { env } from '../config/env';

/** bcrypt cost ≥ 12 (PRD §15.6). Plaintext never leaves this module. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
