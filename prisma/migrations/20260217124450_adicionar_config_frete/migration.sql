-- CreateTable
CREATE TABLE "delivery_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "originCep" VARCHAR(10) NOT NULL,
    "originAddress" VARCHAR(200) NOT NULL,
    "originNumber" VARCHAR(20) NOT NULL,
    "originNeighborhood" VARCHAR(100) NOT NULL,
    "originCity" VARCHAR(100) NOT NULL,
    "originState" VARCHAR(2) NOT NULL,
    "originLat" DECIMAL(10,8),
    "originLng" DECIMAL(11,8),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "delivery_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_ranges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_config_id" UUID NOT NULL,
    "minKm" DECIMAL(5,2) NOT NULL,
    "maxKm" DECIMAL(5,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "delivery_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_ranges_delivery_config_id_idx" ON "delivery_ranges"("delivery_config_id");

-- AddForeignKey
ALTER TABLE "delivery_ranges" ADD CONSTRAINT "delivery_ranges_delivery_config_id_fkey" FOREIGN KEY ("delivery_config_id") REFERENCES "delivery_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
