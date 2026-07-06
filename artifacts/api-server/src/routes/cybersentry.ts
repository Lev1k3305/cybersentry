/**
 * CyberSentry routes — forwards all requests to the Python FastAPI microservice
 * running on localhost:CYBERSENTRY_PY_PORT (default 8000).
 *
 * The Python service handles:
 *   POST /cybersentry/phone  – real phone reputation via numlookupapi.com
 *   POST /cybersentry/email  – real breach check via HIBP / emailrep.io
 *   GET  /cybersentry/log    – live in-memory security event log
 */
import { Router, type IRouter } from "express";
import { CheckPhoneBody, ScanEmailBody } from "@workspace/api-zod";

const router: IRouter = Router();

const PY_BASE = `http://localhost:${process.env.CYBERSENTRY_PY_PORT ?? "8000"}`;

async function forward(
  url: string,
  method: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ─── POST /cybersentry/phone ─────────────────────────────────────────────────

router.post("/cybersentry/phone", async (req, res): Promise<void> => {
  const parsed = CheckPhoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Неверный формат запроса" });
    return;
  }
  try {
    const { status, data } = await forward(
      `${PY_BASE}/cybersentry/phone`,
      "POST",
      parsed.data,
    );
    res.status(status).json(data);
  } catch {
    res.status(503).json({ error: "Сервис проверки номеров временно недоступен" });
  }
});

// ─── POST /cybersentry/email ─────────────────────────────────────────────────

router.post("/cybersentry/email", async (req, res): Promise<void> => {
  const parsed = ScanEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Неверный формат запроса" });
    return;
  }
  try {
    const { status, data } = await forward(
      `${PY_BASE}/cybersentry/email`,
      "POST",
      parsed.data,
    );
    res.status(status).json(data);
  } catch {
    res.status(503).json({ error: "Сервис сканирования утечек временно недоступен" });
  }
});

// ─── GET /cybersentry/log ────────────────────────────────────────────────────

router.get("/cybersentry/log", async (_req, res): Promise<void> => {
  try {
    const { status, data } = await forward(
      `${PY_BASE}/cybersentry/log`,
      "GET",
    );
    res.status(status).json(data);
  } catch {
    res.status(503).json([]);
  }
});

export default router;
