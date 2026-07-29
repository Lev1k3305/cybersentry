import { Router, type IRouter } from "express";
import os from "os";
import { ExecuteCommandBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Track server start time for uptime
const serverStart = Date.now();

// ─── command definitions ────────────────────────────────────────────────────

// ─── OS Metrics Caching layer ────────────────────────────────────────────────
// os.cpus(), os.totalmem(), and os.freemem() can be heavy to call on every tick of poll/command requests.
// Caching with a short TTL (e.g. 2000ms) avoids blocking the Event Loop on high polling frequency.
//
// ⚡ Bolt Optimization: Precalculate and cache computed cpuLoad and usedMemPct.
// Previously, nested reductions on os.cpus() times and memory percentage calculations were executed
// on every single incoming API polling or command request, adding CPU load and garbage collection pressure.
// By computing these values once inside the 2-second cache refresh block, we bypass these calculations
// completely for all subsequent concurrent polling requests, dramatically lowering CPU usage.
interface CachedMetrics {
  cpus: os.CpuInfo[];
  totalMem: number;
  freeMem: number;
  cpuLoad: number; // Precomputed average CPU load percentage (float)
  usedMemPct: number; // Precomputed memory usage percentage (float)
  lastUpdated: number;
  cpuLoadRound: number;
  usedMemPctRound: number;
  cpuLoadFloat: number;
  usedMemPctFloat: number;
}

let cachedMetrics: CachedMetrics | null = null;
const METRICS_TTL = 2000; // 2 seconds TTL

function getOSMetrics(): CachedMetrics {
  const now = Date.now();
  if (!cachedMetrics || now - cachedMetrics.lastUpdated > METRICS_TTL) {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // Integer rounded values for 'status' command console output
    const usedMemPctRound = Math.round(((totalMem - freeMem) / totalMem) * 100);
    const cpuLoadRound =
      cpus.reduce((sum, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return sum + Math.round((1 - cpu.times.idle / total) * 100);
      }, 0) / cpus.length;

    // High-precision float values (1 decimal) for /system/status web and mobile polling dashboard
    const usedMemPctFloat = parseFloat(
      (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
    );
    const cpuLoadFloat = parseFloat(
      (
        cpus.reduce((sum, cpu) => {
          const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
          return sum + (1 - cpu.times.idle / total) * 100;
        }, 0) / cpus.length
      ).toFixed(1),
    );

    cachedMetrics = {
      cpus,
      totalMem,
      freeMem,
      lastUpdated: now,
      cpuLoadRound,
      usedMemPctRound,
      cpuLoadFloat,
      usedMemPctFloat,
      cpuLoad: cpuLoadFloat,
      usedMemPct: usedMemPctFloat,
    };
  }
  return cachedMetrics!;
}

const COMMANDS: Record<
  string,
  () => {
    output: string;
    type: "info" | "success" | "error" | "system" | "clear";
  }
> = {
  help: () => ({
    type: "info",
    output: [
      "╔══════════════════════════════════════════╗",
      "║         ДОСТУПНЫЕ ДИРЕКТИВЫ              ║",
      "╠══════════════════════════════════════════╣",
      "║  help      — список директив             ║",
      "║  status    — состояние системы           ║",
      "║  clear     — очистить терминал          ║",
      "║  ping      — проверка связи              ║",
      "║  whoami    — идентификация оператора     ║",
      "║  uptime    — время работы системы        ║",
      "║  modules   — список активных модулей     ║",
      "║  scan      — сканирование сети           ║",
      "╚══════════════════════════════════════════╝",
    ].join("\n"),
  }),

  status: () => {
    const metrics = getOSMetrics();
    const uptimeSec = Math.floor((Date.now() - serverStart) / 1000);
    const hh = Math.floor(uptimeSec / 3600)
      .toString()
      .padStart(2, "0");
    const mm = Math.floor((uptimeSec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const ss = (uptimeSec % 60).toString().padStart(2, "0");

    return {
      type: "success",
      output: [
        "[ СТАТУС СИСТЕМЫ ]",
        `  ЦПУ        : ${Math.round(metrics.cpuLoadRound)}%`,
        `  ПАМЯТЬ     : ${metrics.usedMemPctRound}%`,
        `  АПТАЙМ     : ${hh}:${mm}:${ss}`,
        `  ОС         : ${os.platform()} ${os.arch()}`,
        `  ПЕРЕХВАТ   : АКТИВЕН`,
        `  СЕТЬ       : ПОДКЛЮЧЕНА`,
        `  ПРОТОКОЛ   : ЗАШИФРОВАН (AES-256)`,
      ].join("\n"),
    };
  },

  clear: () => ({
    type: "clear",
    output: "",
  }),

  ping: () => ({
    type: "success",
    output: `ПОНГ — задержка: ${Math.floor(Math.random() * 12) + 1}мс — ХОСТ: ${os.hostname()}`,
  }),

  whoami: () => ({
    type: "info",
    output: [
      "  ОПЕРАТОР   : ОПЕРАТОР_01",
      "  УРОВЕНЬ    : АЛЬФА-7 [СЕКРЕТНО]",
      "  СЕССИЯ     : #" +
        Math.random().toString(36).slice(2, 10).toUpperCase(),
      "  ДОСТУП     : ПОЛНЫЙ",
    ].join("\n"),
  }),

  uptime: () => {
    const uptimeSec = Math.floor((Date.now() - serverStart) / 1000);
    const hh = Math.floor(uptimeSec / 3600)
      .toString()
      .padStart(2, "0");
    const mm = Math.floor((uptimeSec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const ss = (uptimeSec % 60).toString().padStart(2, "0");
    const sysUptime = Math.floor(os.uptime());
    const sysh = Math.floor(sysUptime / 3600)
      .toString()
      .padStart(2, "0");
    const sysm = Math.floor((sysUptime % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const syss = (sysUptime % 60).toString().padStart(2, "0");
    return {
      type: "info",
      output: [
        `  СЕРВЕР ЦКЦ : ${hh}:${mm}:${ss}`,
        `  СИСТЕМА ОС : ${sysh}:${sysm}:${syss}`,
      ].join("\n"),
    };
  },

  modules: () => ({
    type: "info",
    output: [
      "  [●] ПЕРЕХВАТЧИК-3    ОНЛАЙН   4мс",
      "  [●] ШИФРАТОР-AES     ОНЛАЙН   2мс",
      "  [●] СЕТЕВОЙ МОСТ     ОНЛАЙН   8мс",
      "  [◐] АНАЛИЗАТОР       ДЕГРАДАЦИЯ  45мс",
      "  [●] ЖУРНАЛ СОБЫТИЙ   ОНЛАЙН   1мс",
    ].join("\n"),
  }),

  scan: () => ({
    type: "system",
    output: [
      "  ЗАПУСК СКАНИРОВАНИЯ СЕТИ...",
      `  192.168.1.1   — ОТКРЫТ  [ШЛЮЗ]`,
      `  192.168.1.${Math.floor(Math.random() * 254) + 1}  — ОТКРЫТ  [УЗЕЛ]`,
      `  10.0.0.${Math.floor(Math.random() * 254) + 1}      — ЗАКРЫТ`,
      `  10.0.0.${Math.floor(Math.random() * 254) + 1}      — ФИЛЬТР  [БРАНДМАУЭР]`,
      "  СКАНИРОВАНИЕ ЗАВЕРШЕНО — НАЙДЕНО 2 АКТИВНЫХ ХОСТА",
    ].join("\n"),
  }),
};

// ─── POST /command ──────────────────────────────────────────────────────────

router.post("/command", async (req, res): Promise<void> => {
  const parsed = ExecuteCommandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      command: "",
      output: "ОШИБКА: неверный формат запроса",
      type: "error",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const raw = parsed.data.command.trim().toLowerCase();
  const handler = COMMANDS[raw];
  const timestamp = new Date().toISOString();

  if (!handler) {
    res.status(400).json({
      ok: false,
      command: parsed.data.command,
      output: `ОШИБКА: неизвестная директива "${parsed.data.command}" — введите "help" для списка команд`,
      type: "error",
      timestamp,
    });
    return;
  }

  const result = handler();
  res.json({
    ok: true,
    command: parsed.data.command,
    output: result.output,
    type: result.type,
    timestamp,
  });
});

// ─── GET /system/status ─────────────────────────────────────────────────────

router.get("/system/status", async (_req, res): Promise<void> => {
  const metrics = getOSMetrics();
  const uptimeSec = Math.floor((Date.now() - serverStart) / 1000);

  const modules = [
    {
      name: "ПЕРЕХВАТЧИК-3",
      status: "online" as const,
      latency: Math.floor(Math.random() * 8) + 2,
    },
    {
      name: "ШИФРАТОР-AES",
      status: "online" as const,
      latency: Math.floor(Math.random() * 4) + 1,
    },
    {
      name: "СЕТЕВОЙ МОСТ",
      status: "online" as const,
      latency: Math.floor(Math.random() * 12) + 5,
    },
    {
      name: "АНАЛИЗАТОР",
      status: "degraded" as const,
      latency: Math.floor(Math.random() * 60) + 30,
    },
    { name: "ЖУРНАЛ СОБЫТИЙ", status: "online" as const, latency: 1 },
  ];

  res.json({
    cpu: metrics.cpuLoadFloat,
    memory: metrics.usedMemPctFloat,
    uptime: uptimeSec,
    modules,
    timestamp: new Date().toISOString(),
  });
});

export default router;
