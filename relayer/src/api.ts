/**
 * Private RFQ Relayer — REST API
 * 
 * Serves the in-memory orderbook to the Next.js frontend.
 */

import express from "express";
import cors from "cors";
import { rfqStore } from "./index";

export function startApiServer(port: number) {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", indexed_orders: rfqStore.size });
  });

  /**
   * GET /api/rfqs/active
   * Returns all indexed RFQs for the Orderbook UI
   */
  app.get("/api/rfqs/active", (req, res) => {
    // Sort by created_at descending (newest first)
    const rfqs = Array.from(rfqStore.values())
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    
    res.json({ data: rfqs });
  });

  /**
   * GET /api/rfqs/:id
   * Returns details for a specific RFQ
   */
  app.get("/api/rfqs/:id", (req, res) => {
    const { id } = req.params;
    const rfq = rfqStore.get(id);
    
    if (!rfq) {
      return res.status(404).json({ error: "RFQ not found" });
    }
    
    res.json(rfq);
  });

  app.listen(port, () => {
    console.log(`[relayer] API server listening on http://localhost:${port}`);
  });
}
