import "server-only";

import { prisma } from "@/platform/database/prisma";
import { InventoryService, inventoryStockPort } from "./infrastructure/prisma-inventory-service";

export const inventoryService = new InventoryService(prisma);
export { inventoryStockPort };
