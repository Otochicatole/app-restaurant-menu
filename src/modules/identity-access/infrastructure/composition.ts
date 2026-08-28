import { prisma } from "@/platform/database/prisma";
import { createIdentityAccess } from "../application/identity-access";
import { BCRYPT_DUMMY_PASSWORD_HASH, BcryptPasswordHasher } from "./bcrypt-password-hasher";
import { JoseSessionTokenService, resolveJwtSecret } from "./jose-session-token-service";
import { NextSessionCookie } from "./next-session-cookie";
import { PrismaIdentityRepository } from "./prisma-identity-repository";
import { PrismaLoginThrottle } from "./prisma-login-throttle";

const clock = { now: () => new Date() };
const repository = new PrismaIdentityRepository(prisma);
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JoseSessionTokenService(resolveJwtSecret());
const sessionCookie = new NextSessionCookie();
const loginThrottle = new PrismaLoginThrottle(prisma);

const identityAccess = createIdentityAccess({
  repository,
  passwordHasher,
  tokenService,
  sessionCookie,
  clock,
  loginThrottle,
  dummyPasswordHash: BCRYPT_DUMMY_PASSWORD_HASH,
});

export function getIdentityAccess() {
  return identityAccess;
}
