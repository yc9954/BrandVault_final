-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "download_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP(3),
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_view_count_product_id_idx" ON "Product"("view_count", "product_id");

-- CreateIndex
CREATE INDEX "Product_download_count_product_id_idx" ON "Product"("download_count", "product_id");

-- CreateIndex
CREATE INDEX "Product_created_at_product_id_idx" ON "Product"("created_at", "product_id");
