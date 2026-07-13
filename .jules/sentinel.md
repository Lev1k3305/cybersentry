## 2025-05-22 - [Monorepo Cross-Stack Validation]
**Vulnerability:** Input validation gaps between API gateway, frontend, and microservices.
**Learning:** In a monorepo where OpenAPI is the source of truth, security validation must be applied at the spec level to ensure consistency. Manual validation in the backend microservice (Pydantic) must match the constraints in the OpenAPI spec and generated Zod schemas.
**Prevention:** Always update `lib/api-spec/openapi.yaml` when adding validation and run `codegen` to sync Zod schemas. Ensure Pydantic models in Python services reflect these same constraints.

## 2026-07-13 - [Replit Host Binding Network Constraints]
**Vulnerability:** Attempting to restrict internal helper microservices to local host interface (127.0.0.1) to avoid potential network exposure.
**Learning:** In containerized development environments like Replit, services often need to bind to 0.0.0.0 so that internal webviews, routers, and port mapping can correctly route and forward traffic. Restricting to localhost (127.0.0.1) breaks connection paths and fails routing.
**Prevention:** Retain 0.0.0.0 binding in Replit environments for port accessibility, and rely on gateway-level controls, CORS, or local-only routing configurations for network isolation.
