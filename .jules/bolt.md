# Bolt's Journal - Critical Learnings Only

## 2026-07-06 - [React List Render & Date Formatting Memoization]
**Learning:** In polling-based lists like security logs (fetched every 10 seconds), React re-renders every list item. Formatting dates via `toLocaleTimeString` within render loops is highly CPU-intensive and generates garbage collection pressure on every polling interval.
**Action:** Use `React.memo` with a custom ID comparator (`prev.entry.id === next.entry.id`) to fully bypass re-rendering unchanged historical/immutable log entries, completely skipping expensive Date parsing and localization formatting.

## 2026-07-19 - [FastAPI Shared global AsyncClient for Connection Pooling]
**Learning:** When invoking external API endpoints (like numlookupapi, HIBP, emailrep) in FastAPI, using local `async with httpx.AsyncClient() as client:` blocks re-establishes a fresh TCP connection and TLS handshake on every request, creating a massive latency and network overhead bottleneck.
**Action:** Initialize a single, shared, global `httpx.AsyncClient` managed via a FastAPI lifespan context manager to enable HTTP connection pooling. This reuse of sockets significantly lowers request latencies (saving up to 100-300ms per external API call depending on geographical distance and TLS handshakes) and manages connection resources safely.
