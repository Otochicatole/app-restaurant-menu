import { NextRequest } from "next/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import {
  publicAvailabilityQuerySchema,
  reservationManagement,
} from "@/modules/reservation-management/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    const query = publicAvailabilityQuerySchema.parse({
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      date: searchParams.get("date") || undefined,
    });

    const result = await reservationManagement.getPublicTableAvailability(slug, query);
    return successResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}
