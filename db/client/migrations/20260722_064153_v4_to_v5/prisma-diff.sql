-- DropForeignKey
ALTER TABLE "world" DROP CONSTRAINT "world_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "address" DROP CONSTRAINT "address_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "activity" DROP CONSTRAINT "activity_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "zone" DROP CONSTRAINT "zone_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "mob" DROP CONSTRAINT "mob_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "item" DROP CONSTRAINT "item_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "recipe" DROP CONSTRAINT "recipe_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "npc" DROP CONSTRAINT "npc_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "task" DROP CONSTRAINT "task_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "skill" DROP CONSTRAINT "skill_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "character" DROP CONSTRAINT "character_statisticId_fkey";

-- DropForeignKey
ALTER TABLE "simulator" DROP CONSTRAINT "simulator_statisticId_fkey";

-- DropIndex
DROP INDEX "world_statisticId_key";

-- DropIndex
DROP INDEX "address_statisticId_key";

-- DropIndex
DROP INDEX "activity_statisticId_key";

-- DropIndex
DROP INDEX "zone_statisticId_key";

-- DropIndex
DROP INDEX "mob_statisticId_key";

-- DropIndex
DROP INDEX "item_statisticId_key";

-- DropIndex
DROP INDEX "recipe_statisticId_key";

-- DropIndex
DROP INDEX "npc_statisticId_key";

-- DropIndex
DROP INDEX "task_statisticId_key";

-- DropIndex
DROP INDEX "skill_statisticId_key";

-- DropIndex
DROP INDEX "character_statisticId_key";

-- DropIndex
DROP INDEX "simulator_statisticId_key";

-- AlterTable
ALTER TABLE "world" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "address" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "activity" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "zone" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "mob" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "item" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "recipe" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "npc" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "task" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "skill" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "character" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "simulator" DROP COLUMN "statisticId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "statistic";

