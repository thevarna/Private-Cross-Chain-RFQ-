"use strict";
/**
 * Relayer REST API
 *
 * Serves indexed RFQ data from SQLite to the Next.js frontend.
 * All endpoints are read-only, unauthenticated, CORS-enabled for localhost dev.
 *
 * Base URL: http://localhost:3001
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startApiServer = startApiServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
function startApiServer(db, port) {
    const app = (0, express_1.default)();
    // Allow cross-origin requests from the Next.js dev server
    app.use((0, cors_1.default)({ origin: ["http://localhost:3000", "http://localhost:3001"] }));
    app.use(express_1.default.json());
    // ── GET /health ─────────────────────────────────────────────────────────────
    app.get("/health", (_req, res) => {
        const count = db.prepare("SELECT COUNT(*) as n FROM rfqs").get().n;
        res.json({ ok: true, indexed_rfqs: count, ts: new Date().toISOString() });
    });
    // ── GET /api/rfqs/active ─────────────────────────────────────────────────────
    // Returns all RFQs with status = 0 (Active).
    // Privacy guarantee: no price or size fields are stored or returned.
    app.get("/api/rfqs/active", (_req, res) => {
        try {
            const rows = db.prepare(`SELECT rfq_pubkey, maker_pubkey, status, chain, created_at
         FROM rfqs WHERE status = 0 ORDER BY created_at DESC LIMIT 50`).all();
            res.json({ status: "ok", data: rows });
        }
        catch (err) {
            res.status(500).json({ status: "error", message: err?.message });
        }
    });
    // ── GET /api/rfqs/all ────────────────────────────────────────────────────────
    // Returns all RFQs regardless of status (useful for judge demo).
    app.get("/api/rfqs/all", (_req, res) => {
        try {
            const rows = db.prepare(`SELECT rfq_pubkey, maker_pubkey, status, chain, created_at, updated_at
         FROM rfqs ORDER BY updated_at DESC LIMIT 100`).all();
            res.json({ status: "ok", data: rows });
        }
        catch (err) {
            res.status(500).json({ status: "error", message: err?.message });
        }
    });
    // ── GET /api/rfqs/:pubkey/status ─────────────────────────────────────────────
    // Returns the current status of a specific RFQ (for frontend polling).
    app.get("/api/rfqs/:pubkey/status", (req, res) => {
        try {
            const row = db.prepare(`SELECT rfq_pubkey, status, updated_at FROM rfqs WHERE rfq_pubkey = ?`).get(req.params.pubkey);
            if (!row) {
                return res.status(404).json({ status: "error", message: "RFQ not found" });
            }
            res.json({ status: "ok", data: row });
        }
        catch (err) {
            res.status(500).json({ status: "error", message: err?.message });
        }
    });
    app.listen(port, () => {
        console.log(`[relayer] API server listening on http://localhost:${port}`);
    });
}
