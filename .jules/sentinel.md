## 2025-05-22 - [Monorepo Cross-Stack Validation]
**Vulnerability:** Input validation gaps between API gateway, frontend, and microservices.
**Learning:** In a monorepo where OpenAPI is the source of truth, security validation must be applied at the spec level to ensure consistency. Manual validation in the backend microservice (Pydantic) must match the constraints in the OpenAPI spec and generated Zod schemas.
**Prevention:** Always update `lib/api-spec/openapi.yaml` when adding validation and run `codegen` to sync Zod schemas. Ensure Pydantic models in Python services reflect these same constraints.
