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

## 2026-07-10 - [Express API Gateway OS Metrics Cache & Event Loop Protection]
**Learning:** Synchronous OS metrics operations (like `os.cpus()`, `os.totalmem()`, and `os.freemem()`) inside active Express routes block the Node.js event loop during high-frequency API polling, causing server-side CPU load spikes and degradations in overall network throughput.
**Action:** Implement a short (e.g. 2-second) memory cache layer with TTL checks before executing Node's `os` metrics, shielding the Event Loop from blockages while serving identical cached statuses under frequent API polling.

## 2026-07-11 - [StyleSheet Memoization in React Native]
**Learning:** React Native `StyleSheet.create` reconstructs style objects on every render. If a component has a high-frequency render trigger (such as a 1-second interval timer tick), calling `StyleSheet.create` on every render causes redundant layout and native bridge registry operations.
**Action:** Wrap `StyleSheet.create` inside `React.useMemo` (with dependencies like stable color references, insets, and platform-specific flags) to preserve correct styling while preventing performance overhead on every tick.

## 2026-07-12 - [Express API Gateway Precomputed OS Metrics Caching]
**Learning:** In polling/status-based microservice architectures, caching only raw node metrics (like `os.cpus()`) still leaves heavy mathematical logic and nested array reductions (`cpus.reduce(...)`) to run on every single client request/poll. With high core counts and high polling frequency, this creates redundant server-side CPU utilization and garbage collection pressure.
**Action:** Precalculate and cache computed properties (e.g., `cpuLoad` and `usedMemPct` floats) inside the memory caching layer alongside raw metrics, shielding both API routes and terminal command statuses from doing any runtime computation.

## 2026-07-13 - [React High-Frequency Input Typing & Result Card Memoization]
**Learning:** In screens where a user inputs search parameters (like phone numbers or emails) and renders heavy result components containing maps or complex icons/styles, typing in the input field updates the local text state on every keystroke. This causes the entire parent component to re-render, forcing the heavy result card to redundantly re-render on every single character typed, resulting in keyboard input latency.
**Action:** Wrap the result card components (`PhoneResultCard` and `EmailResultCard`) in `React.memo` to skip all rendering cycles on local text state changes during typing, maintaining a stable 60 FPS typing experience.

## 2026-07-14 - [FastAPI In-Memory TTL Query Cache for Outbound OSINT Endpoints]
**Learning:** Outbound network API requests to external OSINT providers (e.g., NumLookup, HIBP) can introduce significant latency and rate limit hazards. Repeat identical lookups are highly redundant and can be served instantly using an async-safe local in-memory cache layer.
**Action:** Introduce a simple dictionary-based `TTLCache` class with a 5-minute TTL on the Python API microservice to resolve duplicate queries in 0ms, shielding external APIs and speeding up client polling requests.

## 2026-08-01 - [Theme Hook Object Instability and Downstream Memoization Breakers]
**Learning:** Returning a newly created object reference from custom hooks (like `useColors` returning `{ ...palette, radius }`) on every invocation breaks downstream optimizations. It invalidates `React.memo` components comparing `colors` (e.g. `EntryRow` in `TerminalScreen` re-rendering on 500ms blinks) and triggers `StyleSheet.create` reconstructions inside `React.useMemo` (e.g. `StatusScreen` recreating style objects on 1s interval ticks).
**Action:** Wrap hook return values in `React.useMemo` with stable dependencies (such as the base palette reference) to maintain referential stability across high-frequency renders.
