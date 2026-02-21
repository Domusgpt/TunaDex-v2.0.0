import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { initFirestore } from "./firestore/client.js";
import { ProjectStore } from "./firestore/projects.js";
import { getMockProjects } from "./github/mock-data.js";
import healthRouter from "./routes/health.js";
import projectsRouter from "./routes/projects.js";

async function main(): Promise<void> {
  // -----------------------------------------------------------------------
  // Initialize Firestore (or fall back to in-memory)
  // -----------------------------------------------------------------------
  const db = await initFirestore();

  console.log(
    db
      ? "[startup] Firestore connected"
      : "[startup] Using in-memory store"
  );

  // -----------------------------------------------------------------------
  // Create Express app
  // -----------------------------------------------------------------------
  const app = express();

  app.use(cors());
  app.use(express.json());

  // -----------------------------------------------------------------------
  // Mount routes
  // -----------------------------------------------------------------------
  app.use(healthRouter);
  app.use(projectsRouter);

  // -----------------------------------------------------------------------
  // Auto-populate with mock data in demo mode
  // -----------------------------------------------------------------------
  if (config.isDemoMode) {
    console.log("[startup] Demo mode — auto-populating with mock data");
    const mockProjects = getMockProjects();
    await ProjectStore.upsertMany(mockProjects);
    console.log(`[startup] Loaded ${mockProjects.length} mock projects`);
  }

  // -----------------------------------------------------------------------
  // Start server
  // -----------------------------------------------------------------------
  app.listen(config.PORT, () => {
    console.log("");
    console.log("==========================================================");
    console.log("  Project Ontology API Server");
    console.log("==========================================================");
    console.log(`  Mode:      ${config.isDemoMode ? "DEMO" : "LIVE"}`);
    console.log(`  Port:      ${config.PORT}`);
    console.log(`  Org:       ${config.GITHUB_ORG}`);
    console.log(`  Firestore: ${db ? "connected" : "in-memory fallback"}`);
    console.log("==========================================================");
    console.log("");
    console.log(`  Health:    http://localhost:${config.PORT}/api/health`);
    console.log(`  Projects:  http://localhost:${config.PORT}/api/projects`);
    console.log(`  Stats:     http://localhost:${config.PORT}/api/projects/stats`);
    console.log("");
  });
}

main().catch((err) => {
  console.error("[fatal] Failed to start server:", err);
  process.exit(1);
});
