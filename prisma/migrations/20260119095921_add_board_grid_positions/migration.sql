-- Only proceed if BoardPost table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'BoardPost') THEN
    -- Drop order column if it exists
    ALTER TABLE "BoardPost" DROP COLUMN IF EXISTS "order";
    
    -- Add gridX column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'BoardPost' AND column_name = 'gridX') THEN
      ALTER TABLE "BoardPost" ADD COLUMN "gridX" INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    -- Add gridY column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'BoardPost' AND column_name = 'gridY') THEN
      ALTER TABLE "BoardPost" ADD COLUMN "gridY" INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    -- Drop old index if it exists
    DROP INDEX IF EXISTS "BoardPost_order_idx";
    
    -- Create new index if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'BoardPost' AND indexname = 'BoardPost_gridY_gridX_idx') THEN
      CREATE INDEX "BoardPost_gridY_gridX_idx" ON "BoardPost"("gridY", "gridX");
    END IF;
  END IF;
END $$;
