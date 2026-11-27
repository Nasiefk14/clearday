-- CreateEnum
CREATE TYPE "Style" AS ENUM ('BOLD', 'PLAYFUL');

-- CreateEnum
CREATE TYPE "Appearance" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "appearance" "Appearance" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "style" "Style" NOT NULL DEFAULT 'BOLD';
