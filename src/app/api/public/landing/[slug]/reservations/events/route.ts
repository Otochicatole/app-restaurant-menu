import { NextRequest } from "next/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import {
  publicCreateEventReservationSchema,
  reservationManagement,
} from "@/modules/reservation-management/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const result = await reservationManagement.getPublicEvents(slug);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const json = await request.json();
    const command = publicCreateEventReservationSchema.parse(json);

    const reservation = await reservationManagement.createPublicEventReservation(
      slug,
      command,
    );

    return successResponse({ reservation }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
