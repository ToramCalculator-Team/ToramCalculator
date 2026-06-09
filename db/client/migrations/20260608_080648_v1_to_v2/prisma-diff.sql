-- CreateTable
CREATE TABLE "sync_heartbeat" (
    "id" TEXT NOT NULL,
    "seq" BIGINT NOT NULL,
    "emitted_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_heartbeat_pkey" PRIMARY KEY ("id")
);

