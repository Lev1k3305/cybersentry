# Bolt's Journal - Critical Learnings Only

## 2026-07-06 - [React List Render & Date Formatting Memoization]
**Learning:** In polling-based lists like security logs (fetched every 10 seconds), React re-renders every list item. Formatting dates via `toLocaleTimeString` within render loops is highly CPU-intensive and generates garbage collection pressure on every polling interval.
**Action:** Use `React.memo` with a custom ID comparator (`prev.entry.id === next.entry.id`) to fully bypass re-rendering unchanged historical/immutable log entries, completely skipping expensive Date parsing and localization formatting.

## 2026-07-07 - [Python Persistent HTTP Connection Pooling]
**Learning:** Instantiating a new `httpx.AsyncClient` inside API route handlers forces a fresh TCP connection and TLS handshake on every request. For external reputation or breach check APIs, this creates severe request latency bottlenecks and unnecessary socket overhead.
**Action:** Initialize a shared, global `httpx.AsyncClient` inside a FastAPI `lifespan` context manager with configured connection pool limits to reuse established connections, while overriding per-request timeouts dynamically.
