/**
 * api/router.ts
 * Single Vercel serverless function for the entire /api surface.
 *
 * Vercel's plain (non-Next.js) file routing didn't reliably handle catch-all
 * filenames on Windows — `[...path].ts` parsed as `[name='...path']` and only
 * matched one URL segment. So we register one fixed-name function and funnel
 * `/api/*` into it via a vercel.json rewrite.
 *
 * Dispatch by the first path segment to a per-resource handler in server/handlers/.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { playersHandler } from "../server/handlers/players";
import { seriesHandler } from "../server/handlers/series";
import { teamsHandler } from "../server/handlers/teams";
import { matchesHandler } from "../server/handlers/matches";
import { inningsHandler } from "../server/handlers/innings";
import { oversHandler } from "../server/handlers/overs";
import { ballsHandler } from "../server/handlers/balls";
import { statsHandler } from "../server/handlers/stats";

type Handler = (
  req: VercelRequest,
  res: VercelResponse,
  segments: string[]
) => Promise<unknown>;

const handlers: Record<string, Handler> = {
  players: playersHandler,
  series: seriesHandler,
  teams: teamsHandler,
  matches: matchesHandler,
  innings: inningsHandler,
  overs: oversHandler,
  balls: ballsHandler,
  stats: statsHandler,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // The rewrite passes the URL path after /api/ as ?path=<segments>.
  const raw = req.query.path;
  const pathStr = Array.isArray(raw) ? raw.join("/") : raw ?? "";
  const segments = pathStr.split("/").filter(Boolean);

  if (segments.length === 0) {
    return res.status(404).json({ error: "Not found" });
  }

  const [resource, ...rest] = segments;
  const resourceHandler = handlers[resource];
  if (!resourceHandler) {
    return res.status(404).json({ error: `Unknown resource: ${resource}` });
  }

  try {
    await resourceHandler(req, res, rest);
  } catch (error) {
    console.error(`[api/${resource}] error:`, error);
    if (!res.headersSent) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Bad request" });
    }
  }
}
