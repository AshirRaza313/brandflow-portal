-- CreateTable
CREATE TABLE "NotificationReadReceipt" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationReadReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationReadReceipt_userId_notificationId_idx" ON "NotificationReadReceipt"("userId", "notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationReadReceipt_notificationId_userId_key" ON "NotificationReadReceipt"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "NotificationReadReceipt" ADD CONSTRAINT "NotificationReadReceipt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationReadReceipt" ADD CONSTRAINT "NotificationReadReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
