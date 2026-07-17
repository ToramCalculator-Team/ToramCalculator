-- CreateEnum
CREATE TYPE "SimulatorCamp" AS ENUM ('A', 'B');

-- DropForeignKey
ALTER TABLE "member" DROP CONSTRAINT "member_playerId_fkey";

-- DropForeignKey
ALTER TABLE "_campA" DROP CONSTRAINT "_campA_A_fkey";

-- DropForeignKey
ALTER TABLE "_campA" DROP CONSTRAINT "_campA_B_fkey";

-- DropForeignKey
ALTER TABLE "_campB" DROP CONSTRAINT "_campB_A_fkey";

-- DropForeignKey
ALTER TABLE "_campB" DROP CONSTRAINT "_campB_B_fkey";

-- AlterTable
ALTER TABLE "simulator" ADD COLUMN     "logicHz" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "primaryMemberId" TEXT,
ADD COLUMN     "randomSeed" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "team" ADD COLUMN     "belongToSimulatorId" TEXT NOT NULL,
ADD COLUMN     "camp" "SimulatorCamp" NOT NULL;

-- AlterTable
ALTER TABLE "member" DROP COLUMN "playerId",
ADD COLUMN     "characterId" TEXT,
ALTER COLUMN "mobDifficultyFlag" DROP NOT NULL,
ALTER COLUMN "behavior" DROP NOT NULL;

-- DropTable
DROP TABLE "_campA";

-- DropTable
DROP TABLE "_campB";

-- CreateTable
CREATE TABLE "_simulatorAnalysisSources" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_simulatorAnalysisSources_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_simulatorAnalysisTargets" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_simulatorAnalysisTargets_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_simulatorAnalysisSources_B_index" ON "_simulatorAnalysisSources"("B");

-- CreateIndex
CREATE INDEX "_simulatorAnalysisTargets_B_index" ON "_simulatorAnalysisTargets"("B");

-- CreateIndex
CREATE UNIQUE INDEX "simulator_primaryMemberId_key" ON "simulator"("primaryMemberId");

-- AddForeignKey
ALTER TABLE "simulator" ADD CONSTRAINT "simulator_primaryMemberId_fkey" FOREIGN KEY ("primaryMemberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_belongToSimulatorId_fkey" FOREIGN KEY ("belongToSimulatorId") REFERENCES "simulator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_simulatorAnalysisSources" ADD CONSTRAINT "_simulatorAnalysisSources_A_fkey" FOREIGN KEY ("A") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_simulatorAnalysisSources" ADD CONSTRAINT "_simulatorAnalysisSources_B_fkey" FOREIGN KEY ("B") REFERENCES "simulator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_simulatorAnalysisTargets" ADD CONSTRAINT "_simulatorAnalysisTargets_A_fkey" FOREIGN KEY ("A") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_simulatorAnalysisTargets" ADD CONSTRAINT "_simulatorAnalysisTargets_B_fkey" FOREIGN KEY ("B") REFERENCES "simulator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
