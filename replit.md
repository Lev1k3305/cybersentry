# Центральный Командный Центр (ЦКЦ)

A hacker-themed Central Command Console — a full-screen terminal UI in Russian with real-time system telemetry and a command dispatcher.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/command-console run dev` — run the frontend (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifacts/api-server)
- Frontend: React + Vite + Tailwind CSS (artifacts/command-console)
- Validation: Zod (via Orval codegen from OpenAPI spec)
- API codegen: Orval (from lib/api-spec/openapi.yaml)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contract
- `artifacts/api-server/src/routes/command.ts` — command dispatcher + system status endpoint
- `artifacts/command-console/src/components/Terminal.tsx` — interactive terminal UI
- `artifacts/command-console/src/components/Header.tsx` — status indicators
- `artifacts/command-console/src/components/Sidebar.tsx` — CPU/memory/module panel

## Architecture decisions

- Commands are allowlisted server-side (no shell exec) — safe by default
- System status (`/api/system/status`) reads real OS metrics via Node.js `os` module
- Frontend polls `/api/system/status` every 5 seconds via React Query `refetchInterval`
- Structured 400 errors from `/api/command` include a Russian-language `output` field surfaced directly in the terminal
- Boot sequence uses a `useRef` guard to prevent HMR from re-running it

## Product

- Full-screen dark terminal UI (black/#0a0a0a bg, #00ff41 green, #ff006e neon pink)
- All UI text in Russian
- Left sidebar: live CPU%, memory%, uptime, module statuses (auto-refresh 5s)
- Header: ЦКЦ v2.7 title + СИСТЕМА/СЕТЬ/ПЕРЕХВАТ status dots (derived from real module data)
- Terminal: scrollable command log with CRT scanline effect and blinking cursor
- Available commands: help, status, clear, ping, whoami, uptime, modules, scan
- ↑/↓ arrow key command history

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing openapi.yaml
- The `os` module CPU calculation is a snapshot, not a rolling average — values can read very low at idle
- Boot messages use a `bootedRef` guard — removing it causes HMR to duplicate entries

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
