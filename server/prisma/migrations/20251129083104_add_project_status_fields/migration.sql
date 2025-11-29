-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "job_id" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'completed';
