# Palette Journal

## 2025-02-13 - Initializing Palette's Journey
**Learning:** UX improvements on cyber-security panels should focus on clarity, reassurance, and smooth feedback. Form submissions for sensitive identifiers (phones, emails) benefit greatly from active feedback and status reassurance.
**Action:** Always verify keyboard accessibility, ensure appropriate ARIA roles, and use appropriate toast or indicator elements for actions.

## 2026-07-15 - Resetting Sensitive Search and Query State
**Learning:** In cybersecurity and privacy-centric tools (like CyberSentry), users require a quick way to clear searched identifiers to prevent shoulder-surfing. Simply clearing the text input is insufficient because the query result cards (e.g., risk badges/details) remain visible.
**Action:** Provide an easily accessible clear button that simultaneously resets the text input state, resets the TanStack Query/Orval mutation states (using `.reset()`), and automatically restores focus to the input element for screen readers.
