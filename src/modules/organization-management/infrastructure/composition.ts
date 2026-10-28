import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { createOrganizationUseCases } from "../application/organization-use-cases";
import { PrismaOrganizationRepository } from "./prisma-organization-repository";

export const organizationManagementService = createOrganizationUseCases({
  repository: new PrismaOrganizationRepository(), hashPassword: (password) => bcrypt.hash(password, 12),
  generatePassword: () => randomBytes(15).toString("base64url"),
});
