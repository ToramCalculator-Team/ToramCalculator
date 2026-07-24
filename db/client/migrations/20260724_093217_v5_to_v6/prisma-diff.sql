-- AlterTable
ALTER TABLE "skill_variant" DROP COLUMN "targetMainWeaponType",
ADD COLUMN     "targetMainWeaponType" TEXT NOT NULL,
DROP COLUMN "targetSubWeaponType",
ADD COLUMN     "targetSubWeaponType" TEXT NOT NULL,
DROP COLUMN "targetArmorAbilityType",
ADD COLUMN     "targetArmorAbilityType" TEXT NOT NULL;

