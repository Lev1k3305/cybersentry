# Bolt's Journal - Critical Learnings Only

## 2026-07-06 - [React List Render & Date Formatting Memoization]
**Learning:** In polling-based lists like security logs (fetched every 10 seconds), React re-renders every list item. Formatting dates via `toLocaleTimeString` within render loops is highly CPU-intensive and generates garbage collection pressure on every polling interval.
**Action:** Use `React.memo` with a custom ID comparator (`prev.entry.id === next.entry.id`) to fully bypass re-rendering unchanged historical/immutable log entries, completely skipping expensive Date parsing and localization formatting.

## 2026-07-07 - [Python Connection Pooling with Global httpx.AsyncClient]
**Learning:** Creating and closing a separate `httpx.AsyncClient` instance for every outbound HTTP request introduces significant latency overhead due to repeated TCP connection setups and TLS handshakes.
**Action:** Initialize a single, shared, global `httpx.AsyncClient` instance managed via FastAPI's `lifespan` context manager, allowing connection pooling to speed up repeated external API lookups and reduce CPU overhead on the server.

## 2026-07-08 - [Mobile Terminal Blinking Cursor State & List Item Memoization]
**Learning:** In a mobile terminal UI featuring a 500ms blinking cursor state update, the parent component re-renders completely on every blink interval. This forces the entire logs list (FlatList) to trigger layout and render recalculations for all `EntryRow` components, generating high CPU usage and drain on mobile devices.
**Action:** Wrap the list row component (`EntryRow`) in `React.memo` with a custom comparison function checking both the log entry's unique ID and the theme colors context references stability. This cleanly stops rendering overhead for unchanged historical terminal entries completely.

## 2026-07-09 - [Web Command Console Input State & Log Line Memoization]
**Learning:** In a web-based command console terminal interface, typing in the single-line input field updates the local `input` state on every keystroke. This causes the entire list of historical console log items to completely re-render and recalculate layouts on every character typed, lagging the keystroke feedback as the log length increases.
**Action:** Extract log row elements into a separate `<TerminalRow />` component wrapped in `React.memo` with a custom comparison function checking log IDs and timestamps. This cleanly prevents rendering overhead for historical terminal rows when typing in the command console.
