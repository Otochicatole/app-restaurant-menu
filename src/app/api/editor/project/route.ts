import { errorResponse } from "@/platform/http/api-response";

export async function GET() { return errorResponse("RESTAURANT_REQUIRED", "Abrí un restaurante para continuar.", 410); }
export async function PUT() { return errorResponse("RESTAURANT_REQUIRED", "Abrí un restaurante para continuar.", 410); }
