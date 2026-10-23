import { ReservationManagementService } from "../application/reservation-use-cases";
import { PrismaReservationRepository } from "./prisma-reservation-repository";

export const prismaReservationRepository = new PrismaReservationRepository();
export const reservationManagementService = new ReservationManagementService(
  prismaReservationRepository,
);
