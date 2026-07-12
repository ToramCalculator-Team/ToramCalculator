-- AlterTable
ALTER TABLE "character" DROP COLUMN "actions";

-- AlterTable
ALTER TABLE "member" DROP COLUMN "sequence",
ADD COLUMN     "behavior" JSONB NOT NULL,
ADD COLUMN     "formationOrder" INTEGER NOT NULL;

