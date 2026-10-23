-- CreateTable
CREATE TABLE "ReservationTimeSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationTimeSlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationRecurringClosure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'Cerrado por descanso semanal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationRecurringClosure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationBlockedDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'Cerrado por fecha especial',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationBlockedDate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "priceLabel" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "blocksRegularReservations" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RestaurantEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TableReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL DEFAULT '',
    "customerPhone" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 2,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "adminNotes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'LANDING',
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TableReservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TableReservation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "RestaurantEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ReservationTimeSlot_tenantId_time_key" ON "ReservationTimeSlot"("tenantId", "time");
CREATE INDEX "ReservationTimeSlot_tenantId_active_idx" ON "ReservationTimeSlot"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationRecurringClosure_tenantId_dayOfWeek_key" ON "ReservationRecurringClosure"("tenantId", "dayOfWeek");
CREATE INDEX "ReservationRecurringClosure_tenantId_idx" ON "ReservationRecurringClosure"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationBlockedDate_tenantId_date_key" ON "ReservationBlockedDate"("tenantId", "date");
CREATE INDEX "ReservationBlockedDate_tenantId_date_idx" ON "ReservationBlockedDate"("tenantId", "date");

-- CreateIndex
CREATE INDEX "RestaurantEvent_tenantId_date_status_idx" ON "RestaurantEvent"("tenantId", "date", "status");

-- CreateIndex
CREATE INDEX "TableReservation_tenantId_date_status_idx" ON "TableReservation"("tenantId", "date", "status");
CREATE INDEX "TableReservation_tenantId_status_idx" ON "TableReservation"("tenantId", "status");
CREATE INDEX "TableReservation_eventId_idx" ON "TableReservation"("eventId");
