import dotenv from "dotenv";
import { prisma } from "@crm/database";

dotenv.config();

console.log("[CRM Background Worker Engine] Initializing asynchronous task processor...");

/**
 * Simulates a background job processor that periodically scans for unprocessed activities
 * or runs maintenance tasks asynchronously.
 */
async function runBackgroundWorkerLoop() {
  setInterval(async () => {
    try {
      const recentActivitiesCount = await prisma.activity.count();
      console.log(`[Worker Heartbeat] System healthy. Total logged activities tracked: ${recentActivitiesCount}`);
    } catch (err) {
      console.error("[Worker Error] Failed to execute background maintenance sweep:", err);
    }
  }, 15000); // Runs every 15 seconds
}

runBackgroundWorkerLoop();
