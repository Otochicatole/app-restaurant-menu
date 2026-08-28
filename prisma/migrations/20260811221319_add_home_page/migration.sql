-- CreateTable
CREATE TABLE "HomePage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Fuzion',
    "description" TEXT NOT NULL DEFAULT 'Desayunos y meriendas',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
