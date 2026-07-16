# Bolt's Journal - Critical Learnings Only

## 2026-07-06 - [React List Render & Date Formatting Memoization]
**Learning:** In polling-based lists like security logs (fetched every 10 seconds), React re-renders every list item. Formatting dates via `toLocaleTimeString` within render loops is highly CPU-intensive and generates garbage collection pressure on every polling interval.
**Action:** Use `React.memo` with a custom ID comparator (`prev.entry.id === next.entry.id`) to fully bypass re-rendering unchanged historical/immutable log entries, completely skipping expensive Date parsing and localization formatting.

## 2026-07-07 - [Shared httpx.AsyncClient connection pooling in FastAPI]
**Learning:** Instantiating a new `httpx.AsyncClient` inside API request routes causes significant latency overhead on every request due to establishing new TCP connections and performing expensive SSL/TLS handshakes.
**Action:** Initialize a single, shared, global `httpx.AsyncClient` managed via FastAPI's `lifespan` context manager to leverage connection pooling and drastically speed up outgoing HTTP requests.
