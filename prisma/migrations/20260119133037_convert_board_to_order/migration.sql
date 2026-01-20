-- Convert BoardPost from gridX/gridY to order field
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'BoardPost') THEN
    -- Add order column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'BoardPost' AND column_name = 'order') THEN
      ALTER TABLE "BoardPost" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    -- Populate order from existing gridX/gridY values (order = gridY * 4 + gridX)
    -- This preserves the current visual order
    UPDATE "BoardPost" 
    SET "order" = ("gridY" * 4 + "gridX")
    WHERE "order" = 0 OR "order" IS NULL;
    
    -- Drop old index
    DROP INDEX IF EXISTS "BoardPost_gridY_gridX_idx";
    
    -- Create new index on order
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'BoardPost' AND indexname = 'BoardPost_order_idx') THEN
      CREATE INDEX "BoardPost_order_idx" ON "BoardPost"("order");
    END IF;
    
    -- Drop gridX and gridY columns
    ALTER TABLE "BoardPost" DROP COLUMN IF EXISTS "gridX";
    ALTER TABLE "BoardPost" DROP COLUMN IF EXISTS "gridY";
  END IF;
END $$;
