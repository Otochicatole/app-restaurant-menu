import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { PasswordHasher, TemporaryCredentialGenerator } from "../application/ports";

export class BcryptPasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}

export class SecureTemporaryCredentialGenerator implements TemporaryCredentialGenerator {
  generate(): string {
    return randomBytes(15).toString("base64url");
  }
}
