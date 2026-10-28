import { NextRequest } from "next/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import {
  publicCreateTableReservationSchema,
  reservationManagement,
} from "@/modules/reservation-management/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const json = await request.json();
    const command = publicCreateTableReservationSchema.parse(json);

    const reservation = await reservationManagement.createPublicTableReservation(
      slug,
      command,
    );

    return successResponse({ reservation }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
