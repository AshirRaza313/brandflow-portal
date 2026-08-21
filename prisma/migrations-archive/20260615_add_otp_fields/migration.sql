-- AlterTable: Add OTP fields to User model
ALTER TABLE "User" ADD COLUMN "otpCode" TEXT;
ALTER TABLE "User" ADD COLUMN "otpExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "otpVerified" BOOLEAN NOT NULL DEFAULT false;
