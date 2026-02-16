/*
  Warnings:

  - Added the required column `size` to the `products` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `image` on the `products` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProductSize" AS ENUM ('PEQUENO', 'MEDIO', 'GRANDE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'WHATSAPP');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "size" "ProductSize" NOT NULL,
DROP COLUMN "image",
ADD COLUMN     "image" BYTEA NOT NULL;

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "externalReference" TEXT NOT NULL,
    "customerName" VARCHAR(100) NOT NULL,
    "customerEmail" VARCHAR(254) NOT NULL,
    "customerPhone" VARCHAR(20) NOT NULL,
    "customerCpf" VARCHAR(14) NOT NULL,
    "addressStreet" VARCHAR(100) NOT NULL,
    "addressNumber" VARCHAR(20) NOT NULL,
    "addressComplement" VARCHAR(100),
    "addressNeighborhood" VARCHAR(50) NOT NULL,
    "addressCity" VARCHAR(50) NOT NULL,
    "addressState" VARCHAR(2) NOT NULL,
    "addressZip" VARCHAR(10) NOT NULL,
    "addressReference" VARCHAR(100),
    "addressType" VARCHAR(20) NOT NULL,
    "deliveryNotes" VARCHAR(500),
    "items" JSONB NOT NULL,
    "cakeSize" VARCHAR(20),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "deliveryPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "mercadoPagoPaymentId" VARCHAR(255),
    "cardLastFour" VARCHAR(4),
    "installments" INTEGER DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "whatsappSentAt" TIMESTAMPTZ(6),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderExternalRef" TEXT NOT NULL,
    "mercadoPagoId" VARCHAR(255) NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "statusDetail" VARCHAR(255),
    "transactionAmount" DECIMAL(10,2) NOT NULL,
    "paymentMethodId" VARCHAR(50) NOT NULL,
    "webhookData" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_externalReference_key" ON "orders"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "orders_mercadoPagoPaymentId_key" ON "orders"("mercadoPagoPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_mercadoPagoId_key" ON "payments"("mercadoPagoId");
