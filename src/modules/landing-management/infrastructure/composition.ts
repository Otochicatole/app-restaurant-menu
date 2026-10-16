import { createLandingUseCases } from "../application/landing-use-cases";
import { PrismaLandingRepository } from "./prisma-landing-repository";

const landingRepository = new PrismaLandingRepository();
export const landingManagementService = createLandingUseCases(landingRepository);
