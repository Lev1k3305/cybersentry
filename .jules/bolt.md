# Bolt's Journal - Critical Learnings Only

## 2026-07-06 - [React List Render & Date Formatting Memoization]
**Learning:** In polling-based lists like security logs (fetched every 10 seconds), React re-renders every list item. Formatting dates via `toLocaleTimeString` within render loops is highly CPU-intensive and generates garbage collection pressure on every polling interval.
**Action:** Use `React.memo` with a custom ID comparator (`prev.entry.id === next.entry.id`) to fully bypass re-rendering unchanged historical/immutable log entries, completely skipping expensive Date parsing and localization formatting.

## 2026-07-07 - [Python Connection Pooling with Global httpx.AsyncClient]
**Learning:** Creating and closing a separate `httpx.AsyncClient` instance for every outbound HTTP request introduces significant latency overhead due to repeated TCP connection setups and TLS handshakes.
**Action:** Initialize a single, shared, global `httpx.AsyncClient` instance managed via FastAPI's `lifespan` context manager, allowing connection pooling to speed up repeated external API lookups and reduce CPU overhead on the server.
