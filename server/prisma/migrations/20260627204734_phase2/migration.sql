-- CreateTable
CREATE TABLE "RecurringPass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passToken" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'MAIN_CAMPUS',
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    "purpose" TEXT NOT NULL,
    "biometricEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringPass_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringPass_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringPassEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passId" TEXT NOT NULL,
    "gateId" TEXT,
    "guardId" TEXT,
    "entryAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitAt" DATETIME,
    CONSTRAINT "RecurringPassEntry_passId_fkey" FOREIGN KEY ("passId") REFERENCES "RecurringPass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'PUSH',
    "event" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visitId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Gate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "allowedZones" TEXT NOT NULL DEFAULT 'MAIN_CAMPUS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Gate" ("createdAt", "id", "isActive", "location", "name") SELECT "createdAt", "id", "isActive", "location", "name" FROM "Gate";
DROP TABLE "Gate";
ALTER TABLE "new_Gate" RENAME TO "Gate";
CREATE TABLE "new_Visit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitorId" TEXT NOT NULL,
    "hostId" TEXT,
    "guardId" TEXT,
    "gateId" TEXT,
    "purpose" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "zone" TEXT NOT NULL DEFAULT 'MAIN_CAMPUS',
    "visitType" TEXT NOT NULL DEFAULT 'PRE_APPROVED',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledAt" DATETIME NOT NULL,
    "windowStart" DATETIME NOT NULL,
    "windowEnd" DATETIME NOT NULL,
    "qrToken" TEXT NOT NULL,
    "qrUsed" BOOLEAN NOT NULL DEFAULT false,
    "qrUsedAt" DATETIME,
    "entryAt" DATETIME,
    "exitAt" DATETIME,
    "language" TEXT NOT NULL DEFAULT 'en',
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentMethod" TEXT,
    "isMultiDay" BOOLEAN NOT NULL DEFAULT false,
    "validUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Visit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visit_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Visit_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Visit_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "Gate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Visit" ("category", "consentGiven", "consentMethod", "createdAt", "entryAt", "exitAt", "gateId", "guardId", "hostId", "id", "language", "purpose", "qrToken", "qrUsed", "qrUsedAt", "scheduledAt", "status", "updatedAt", "visitType", "visitorId", "windowEnd", "windowStart", "zone") SELECT "category", "consentGiven", "consentMethod", "createdAt", "entryAt", "exitAt", "gateId", "guardId", "hostId", "id", "language", "purpose", "qrToken", "qrUsed", "qrUsedAt", "scheduledAt", "status", "updatedAt", "visitType", "visitorId", "windowEnd", "windowStart", "zone" FROM "Visit";
DROP TABLE "Visit";
ALTER TABLE "new_Visit" RENAME TO "Visit";
CREATE UNIQUE INDEX "Visit_qrToken_key" ON "Visit"("qrToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RecurringPass_passToken_key" ON "RecurringPass"("passToken");
