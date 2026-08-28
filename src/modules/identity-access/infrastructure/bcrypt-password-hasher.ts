import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../application/ports";

export const BCRYPT_DUMMY_PASSWORD_HASH =
  "$2b$12$7UhzBcLAyRdSsrNYEdZLnO9gZX6QNBPla8DvFZd855x2xn97ZYJH2";

export class BcryptPasswordHasher implements PasswordHasher {
  compare(plainText: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainText, passwordHash);
  }

  hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, 12);
  }
}
