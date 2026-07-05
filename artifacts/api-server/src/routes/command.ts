import { Router, type IRouter } from "express";
import os from "os";
import { ExecuteCommandBody } from "@workspace/api-zod";

const router: IRouter = Router();

// Track server start time for uptime
const serverStart = Date.now();

// ─── command definitions ────────────────────────────────────────────────────

const COMMANDS: Record<
  string,
  () => { output: string; type: "info" | "success" | "error" | "system" | "clear" }
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
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMemPct = Math.round(((totalMem - freeMem) / totalMem) * 100);
    const uptimeSec = Math.floor((Date.now() - serverStart) / 1000);
    const hh = Math.floor(uptimeSec / 3600).toString().padStart(2, "0");
    const mm = Math.floor((uptimeSec % 3600) / 60).toString().padStart(2, "0");
    const ss = (uptimeSec % 60).toString().padStart(2, "0");

    const cpuLoad = cpus.reduce((sum, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return sum + Math.round((1 - cpu.times.idle / total) * 100);
    }, 0) / cpus.length;

    return {
      type: "success",
      output: [
        "[ СТАТУС СИСТЕМЫ ]",
        `  ЦПУ        : ${Math.round(cpuLoad)}%`,
        `  ПАМЯТЬ     : ${usedMemPct}%`,
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
      "  СЕССИЯ     : #" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      "  ДОСТУП     : ПОЛНЫЙ",
    ].join("\n"),
  }),

  uptime: () => {
    const uptimeSec = Math.floor((Date.now() - serverStart) / 1000);
    const hh = Math.floor(uptimeSec / 3600).toString().padStart(2, "0");
    const mm = Math.floor((uptimeSec % 3600) / 60).toString().padStart(2, "0");
    const ss = (uptimeSec % 60).toString().padStart(2, "0");
    const sysUptime = Math.floor(os.uptime());
    const sysh = Math.floor(sysUptime / 3600).toString().padStart(2, "0");
    const sysm = Math.floor((sysUptime % 3600) / 60).toString().padStart(2, "0");
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
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPct = parseFloat(
    (((totalMem - freeMem) / totalMem) * 100).toFixed(1)
  );

  const cpuLoad = parseFloat(
    (
      cpus.reduce((sum, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return sum + (1 - cpu.times.idle / total) * 100;
      }, 0) / cpus.length
    ).toFixed(1)
  );

  const uptimeSec = Math.floor((Date.now() - serverStart) / 1000);

  const modules = [
    { name: "ПЕРЕХВАТЧИК-3", status: "online" as const, latency: Math.floor(Math.random() * 8) + 2 },
    { name: "ШИФРАТОР-AES", status: "online" as const, latency: Math.floor(Math.random() * 4) + 1 },
    { name: "СЕТЕВОЙ МОСТ", status: "online" as const, latency: Math.floor(Math.random() * 12) + 5 },
    { name: "АНАЛИЗАТОР", status: "degraded" as const, latency: Math.floor(Math.random() * 60) + 30 },
    { name: "ЖУРНАЛ СОБЫТИЙ", status: "online" as const, latency: 1 },
  ];

  res.json({
    cpu: cpuLoad,
    memory: usedMemPct,
    uptime: uptimeSec,
    modules,
    timestamp: new Date().toISOString(),
  });
});

export default router;
