/**
 * Relayer REST API
 *
 * Serves indexed RFQ data from SQLite to the Next.js frontend.
 * All endpoints are read-only, unauthenticated, CORS-enabled for localhost dev.
 *
 * Base URL: http://localhost:3001
 */
import Database from "better-sqlite3";
export declare function startApiServer(db: Database.Database, port: number): void;
