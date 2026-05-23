# Project Context

This document serves as the primary source of truth for the project. Follow these rules strictly to maintain architectural integrity.

## 🏗️ Architecture Rules
- **Pattern**: Event-Driven Architecture (EDA) using NestJS and RabbitMQ.
- **Pipeline Flow**: `API (Lead Creation) -> lead.enrichment (Queue) -> EnrichmentWorker -> lead.classification (Queue) -> ClassificationWorker`.
- **State Machine**: Leads must follow the status flow: `PENDING -> ENRICHING -> ENRICHED -> CLASSIFYING -> CLASSIFIED`.
- **Database**: PostgreSQL with Prisma. Use the **Hybrid Storage Strategy**:
 - Fixed/Predictable data: Use typed columns.
 - Variable/Heterogeneous data: Use `JSONB` columns (e.g., `address`, `partners`, `cnaes`).

## 💻 Coding Standards
- **Framework**: NestJS (v11). Keep controllers thin; business logic belongs in Services.
- **Workers**: Workers must be idempotent and handle infrastructure failures using RabbitMQ Nack/DLQ.
- **AI Integration**: Always validate AI outputs (Ollama) using **Zod schemas** to prevent data corruption.
- **Type Safety**: Avoid `any`. Use Prisma-generated types or explicit interfaces.

## 🧪 Testing Requirements
- **Location**: All tests must be modularized in the `test/` directory.
 - Unit Tests: `test/unit/**/*.spec.ts`
 - E2E Tests: `test/e2e/**/*.e2e.test.ts`
- **Coverage**: Every new feature or architectural change must include corresponding unit and/or E2E tests.

## 📚 Documentation
- Keep the `README.md` updated with any changes to the API or infrastructure.
- Use Mermaid diagrams for complex flows or ER models.

## 🚀 Reuse First
- Before creating a new service or utility, search the codebase for existing implementations.
- Use existing RabbitMQ and Prisma services instead of creating new connections.
