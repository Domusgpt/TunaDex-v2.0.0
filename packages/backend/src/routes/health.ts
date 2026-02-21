import { Router } from "express";
import { config } from "../config.js";

const router = Router();

router.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    mode: config.isDemoMode ? "demo" : "live",
    timestamp: new Date().toISOString(),
  });
});

export default router;
