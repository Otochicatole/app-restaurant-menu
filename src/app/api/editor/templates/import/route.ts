import { errorResponse } from "@/platform/http/api-response";

export async function POST() { return errorResponse("RESTAURANT_REQUIRED", "Abrí un restaurante para continuar.", 410); }
