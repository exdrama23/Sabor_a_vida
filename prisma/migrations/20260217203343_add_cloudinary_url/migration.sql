-- AlterTable
ALTER TABLE "products" ADD COLUMN     "imageUrl" VARCHAR(500),
ALTER COLUMN "image" DROP NOT NULL;
