-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "asset_count" INTEGER NOT NULL DEFAULT 0;

-- 1. Product 테이블에 변경이 있을 때 호출될 함수를 정의합니다.
CREATE OR REPLACE FUNCTION update_brand_asset_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Product가 삽입(INSERT)될 때 (NEW는 새로 삽입된 행)
    IF (TG_OP = 'INSERT') THEN
        UPDATE "Brand"
        SET asset_count = asset_count + 1
        WHERE brand_id = NEW.brand_id;
        RETURN NEW;
    
    -- Product가 삭제(DELETE)될 때 (OLD는 삭제되는 행)
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE "Brand"
        SET asset_count = asset_count - 1
        WHERE brand_id = OLD.brand_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Product 테이블의 INSERT 또는 DELETE 작업 이후에 트리거를 연결합니다.
CREATE TRIGGER product_count_update
AFTER INSERT OR DELETE ON "Product"
FOR EACH ROW EXECUTE FUNCTION update_brand_asset_count();