# 🏗️ Gateway API v3 - Kiến Trúc Hợp Nhất & Roadmap Chi Tiết

## 📊 PHẦN 1: PHÂN TÍCH HIỆN TRẠNG V1 & V2

### 🔍 V1 API Analysis

**Điểm Mạnh:**

- ✅ Kiến trúc rõ ràng, phân tách theo domain
- ✅ Đầy đủ CRUD operations cho core entities
- ✅ Admin panel hoàn chỉnh
- ✅ Audit logging đầy đủ
- ✅ Policy engine mạnh mẽ

**Điểm Yếu:**

- ❌ Không có streaming support
- ❌ HTTP-only, không có WebSocket
- ❌ Thiếu workflow orchestration
- ❌ Response time cao với LLM calls
- ❌ Không có real-time collaboration

**Endpoints Breakdown:**

```typescript
/v1/
├── /admin/*                    [10 endpoints] - User, Role, Policy management
├── /auth/*                     [5 endpoints]  - Login, Logout, Refresh, Register, Verify
├── /conversations/*            [8 endpoints]  - CRUD + Summarize, Search, Export
├── /conversations/:id/messages [4 endpoints]  - Create, List, Update, Delete
├── /audit/*                    [3 endpoints]  - Events, Search, Export
├── /chats/*                    [2 endpoints]  - Send message, Get history
├── /files/*                    [6 endpoints]  - Upload, Download, Delete, List, Preview, Share
├── /incidents/*                [7 endpoints]  - Create, Update, List, Resolve, Escalate
├── /models/*                   [4 endpoints]  - List, Get, Usage stats, Compare
├── /providers-health/*         [2 endpoints]  - Status, History
├── /stats/*                    [8 endpoints]  - Overview, Models, Tools, Users, Cost, Latency
├── /tools/*                    [5 endpoints]  - List, Get, Run, Validate, Usage
└── /workflows/*                [0 endpoints]  - MISSING in v1
```

**Total v1 Endpoints: ~64 endpoints**

---

### 🚀 V2 API Analysis

**Điểm Mạnh:**

- ✅ Server-Sent Events (SSE) streaming
- ✅ WebSocket support
- ✅ Workflow orchestration
- ✅ Real-time metrics
- ✅ Better performance với streaming

**Điểm Yếu:**

- ❌ Chỉ có 2 streaming endpoints
- ❌ Thiếu nhiều features từ v1
- ❌ Không có migration path rõ ràng
- ❌ Documentation chưa đầy đủ
- ❌ Workflow engine còn đơn giản

**Endpoints Breakdown:**

```typescript
/v2/
├── /chat-stream/*     [2 endpoints]  - Stream chat, Stream with tools
├── /chats/*           [1 endpoint]   - Enhanced chat (non-streaming)
├── /workflows/*       [3 endpoints]  - Execute, List, Status
├── /health/*          [2 endpoints]  - Deep check, Metrics
├── /metrics/*         [2 endpoints]  - Real-time, Aggregate
└── /websocket/*       [1 endpoint]   - WS connection
```

**Total v2 Endpoints: ~11 endpoints**

---

### 🔄 Gap Analysis

| Feature Category | V1 | V2 | Gap |
|-----------------|----|----|-----|
| **Authentication** | ✅ Full | ❌ None | v2 needs full auth |
| **Conversations** | ✅ Full CRUD | ❌ Limited | v2 needs CRUD |
| **Messages** | ✅ Full | ✅ Streaming | Merge needed |
| **Admin** | ✅ Complete | ❌ None | v2 needs admin |
| **Tools** | ✅ Full | ✅ Enhanced | Merge needed |
| **Files** | ✅ Full | ❌ None | v2 needs files |
| **Audit** | ✅ Full | ❌ Limited | v2 needs audit |
| **Streaming** | ❌ None | ✅ Full | v1 needs streaming |
| **WebSocket** | ❌ None | ✅ Basic | v1 needs WS |
| **Workflows** | ❌ None | ✅ Basic | v1 needs workflows |
| **Real-time Metrics** | ❌ Limited | ✅ Full | v1 needs real-time |

**Conclusion:**

- **v1** có depth nhưng thiếu real-time capabilities
- **v2** có real-time nhưng thiếu breadth của v1
- **v3** cần merge cả hai + thêm features mới

---

## 📦 PHẦN 2: PACKAGES - HIỆN TẠI & ĐỀ XUẤT

### 🔧 A. CẢI TIẾN PACKAGES HIỆN CÓ

#### **1. @domain/core - Enhanced Domain Models**

**Hiện tại:**

```typescript
- User, Conversation, Message, Policy models
- Basic entity rules
```

**Đề xuất bổ sung:**

```typescript
// New domain models
├── models/
│   ├── existing/
│   │   ├── user.ts
│   │   ├── conversation.ts
│   │   ├── message.ts
│   │   └── policy.ts
│   │
│   ├── NEW - workflow.ts              // Workflow definition
│   ├── NEW - workflow-execution.ts    // Workflow runtime state
│   ├── NEW - workflow-step.ts         // Individual workflow steps
│   ├── NEW - notification.ts          // Notification entity
│   ├── NEW - webhook.ts               // Webhook configuration
│   ├── NEW - integration.ts           // External integrations
│   ├── NEW - team.ts                  // Team/Organization
│   ├── NEW - api-key.ts               // API key management
│   ├── NEW - session.ts               // User sessions
│   ├── NEW - file-metadata.ts         // File metadata
│   ├── NEW - search-index.ts          // Search indexing
│   ├── NEW - report.ts                // Analytics reports
│   ├── NEW - alert.ts                 // Alert definitions
│   └── NEW - feature-flag.ts          // Feature flags

// Domain services
├── services/
│   ├── NEW - workflow-engine.ts       // Workflow execution logic
│   ├── NEW - notification-service.ts  // Notification dispatch
│   ├── NEW - search-service.ts        // Search orchestration
│   ├── NEW - analytics-service.ts     // Analytics computation
│   └── NEW - integration-service.ts   // Integration management

// Value objects
├── value-objects/
│   ├── NEW - money.ts                 // Money/currency
│   ├── NEW - date-range.ts            // Date ranges
│   ├── NEW - permission-set.ts        // Permission collections
│   └── NEW - webhook-signature.ts     // Webhook signing
```

**10+ New Features:**

1. Workflow domain models với state machine
2. Notification aggregation và batching
3. Webhook signature verification logic
4. Team hierarchy và inheritance rules
5. API key scoping và rotation
6. Session management với device tracking
7. File metadata extraction pipeline
8. Search relevance scoring algorithms
9. Report scheduling và caching
10. Alert rule evaluation engine
11. Feature flag evaluation với targeting
12. Money object với currency conversion

---

#### **2. @contracts/shared - Extended Type System**

**Hiện tại:**

```typescript
- Basic DTOs
- Simple type definitions
```

**Đề xuất bổ sung:**

```typescript
├── types/
│   ├── existing/ (current types)
│   │
│   ├── NEW - workflow-types.ts        // Workflow DTOs
│   ├── NEW - streaming-types.ts       // SSE/WS types
│   ├── NEW - webhook-types.ts         // Webhook payloads
│   ├── NEW - analytics-types.ts       // Analytics DTOs
│   ├── NEW - integration-types.ts     // Integration configs
│   ├── NEW - notification-types.ts    // Notification DTOs
│   ├── NEW - search-types.ts          // Search query/results
│   ├── NEW - billing-types.ts         // Billing & usage
│   ├── NEW - monitoring-types.ts      // Metrics & traces
│   └── NEW - collaboration-types.ts   // Real-time collab

├── enums/
│   ├── NEW - workflow-status.enum.ts
│   ├── NEW - notification-channel.enum.ts
│   ├── NEW - integration-type.enum.ts
│   └── NEW - event-type.enum.ts

├── schemas/
│   ├── NEW - zod-schemas/             // Zod validation schemas
│   │   ├── workflow.schema.ts
│   │   ├── webhook.schema.ts
│   │   ├── search.schema.ts
│   │   └── analytics.schema.ts
│   │
│   └── NEW - openapi/                 // OpenAPI 3.1 schemas
│       ├── v3-spec.yaml
│       └── components.yaml

├── NEW - validators/                   // Reusable validators
│   ├── email-validator.ts
│   ├── url-validator.ts
│   ├── json-schema-validator.ts
│   └── custom-validators.ts
```

**10+ New Features:**

1. Branded types cho type safety (UserId, ConversationId)
2. Union types cho workflow states
3. Discriminated unions cho events
4. Generic DTOs cho pagination
5. Recursive types cho nested data
6. Template literal types cho routes
7. Conditional types cho permissions
8. Mapped types cho partial updates
9. Intersection types cho mixins
10. Utility types cho transformations
11. OpenAPI type generation
12. JSON Schema to TypeScript conversion

---

#### **3. @config/core - Advanced Configuration**

**Hiện tại:**

```typescript
- Basic env variables
- Model tiers (T0-T3)
```

**Đề xuất bổ sung:**

```typescript
├── config/
│   ├── existing/
│   │   ├── config.ts
│   │   └── tiers.ts
│   │
│   ├── NEW - feature-flags.ts         // Feature flag config
│   ├── NEW - rate-limits.ts           // Rate limit configs
│   ├── NEW - cache-config.ts          // Cache strategies
│   ├── NEW - workflow-config.ts       // Workflow settings
│   ├── NEW - monitoring-config.ts     // Observability config
│   ├── NEW - integration-config.ts    // Integration credentials
│   ├── NEW - security-config.ts       // Security policies
│   ├── NEW - storage-config.ts        // Storage backends
│   ├── NEW - queue-config.ts          // Queue configurations
│   └── NEW - deployment-config.ts     // Deployment-specific

├── NEW - validation/
│   ├── config-validator.ts            // Validate all configs
│   ├── env-validator.ts               // Env var validation
│   └── schema-validator.ts            // Schema validation

├── NEW - loaders/
│   ├── env-loader.ts                  // Load from .env
│   ├── secrets-loader.ts              // Load from vault
│   ├── remote-loader.ts               // Load from remote config
│   └── dynamic-loader.ts              // Runtime config updates

├── NEW - presets/
│   ├── development.ts                 // Dev presets
│   ├── staging.ts                     // Staging presets
│   ├── production.ts                  // Prod presets
│   └── testing.ts                     // Test presets
```

**10+ New Features:**

1. Environment-based config overrides
2. Feature flag management với LaunchDarkly
3. Dynamic config reloading without restart
4. Config versioning và rollback
5. Secret rotation automation
6. Config validation trước khi deploy
7. Config templates cho multi-tenant
8. Config inheritance hierarchy
9. Config audit logging
10. A/B testing config splits
11. Config encryption at rest
12. Config sync across instances

---

#### **4. @infra/postgres - Enhanced Database Layer**

**Hiện tại:**

```typescript
- Basic client & connection pooling
- Simple repos for CRUD
```

**Đề xuất bổ sung:**

```typescript
├── repos/
│   ├── existing/ (users, conversations, messages)
│   │
│   ├── NEW - workflow-repo.ts
│   ├── NEW - notification-repo.ts
│   ├── NEW - webhook-repo.ts
│   ├── NEW - team-repo.ts
│   ├── NEW - api-key-repo.ts
│   ├── NEW - session-repo.ts
│   ├── NEW - file-metadata-repo.ts
│   ├── NEW - search-index-repo.ts
│   ├── NEW - report-repo.ts
│   ├── NEW - alert-repo.ts
│   └── NEW - feature-flag-repo.ts

├── NEW - query-builder/               // Advanced query builder
│   ├── select-builder.ts
│   ├── join-builder.ts
│   ├── where-builder.ts
│   └── pagination-builder.ts

├── NEW - migrations/                  // Migration management
│   ├── migration-runner.ts
│   ├── migration-generator.ts
│   └── rollback-manager.ts

├── NEW - indexes/                     // Index management
│   ├── index-analyzer.ts
│   ├── index-optimizer.ts
│   └── missing-index-detector.ts

├── NEW - partitioning/                // Table partitioning
│   ├── partition-manager.ts
│   ├── time-based-partitions.ts
│   └── partition-pruning.ts

├── NEW - replication/                 // Read replica support
│   ├── replica-manager.ts
│   ├── read-write-splitting.ts
│   └── replication-lag-monitor.ts

├── NEW - transactions/                // Advanced transactions
│   ├── transaction-manager.ts
│   ├── savepoint-manager.ts
│   └── distributed-transactions.ts

├── NEW - backup/                      // Backup utilities
│   ├── backup-manager.ts
│   ├── point-in-time-recovery.ts
│   └── backup-verification.ts
```

**10+ New Features:**

1. Connection pooling với pg-pool
2. Read replica load balancing
3. Query performance monitoring
4. Automatic retry với exponential backoff
5. Prepared statements caching
6. Bulk insert optimization
7. Soft delete implementation
8. Optimistic locking
9. Database health checks
10. Query explain analysis
11. Migration versioning
12. Schema validation

---

#### **5. @infra/redis - Advanced Caching**

**Hiện tại:**

```typescript
- Basic cache operations
- Session storage
```

**Đề xuất bổ sung:**

```typescript
├── cache/
│   ├── existing/
│   │   ├── client.ts
│   │   └── cache.ts
│   │
│   ├── NEW - multi-level-cache.ts     // L1 + L2 caching
│   ├── NEW - cache-aside.ts           // Cache-aside pattern
│   ├── NEW - write-through.ts         // Write-through cache
│   ├── NEW - write-behind.ts          // Write-behind queue
│   └── NEW - cache-invalidation.ts    // Smart invalidation

├── NEW - pub-sub/                     // Redis Pub/Sub
│   ├── publisher.ts
│   ├── subscriber.ts
│   ├── channel-manager.ts
│   └── event-bus.ts

├── NEW - rate-limiting/               // Advanced rate limiting
│   ├── token-bucket.ts
│   ├── sliding-window.ts
│   ├── fixed-window.ts
│   └── distributed-rate-limiter.ts

├── NEW - locks/                       // Distributed locks
│   ├── redlock.ts
│   ├── mutex.ts
│   └── semaphore.ts

├── NEW - queues/                      // Job queues with BullMQ
│   ├── job-queue.ts
│   ├── job-scheduler.ts
│   ├── job-retry.ts
│   └── job-monitoring.ts

├── NEW - streams/                     // Redis Streams
│   ├── stream-producer.ts
│   ├── stream-consumer.ts
│   ├── consumer-group.ts
│   └── stream-processor.ts

├── NEW - leaderboards/                // Sorted sets for rankings
│   ├── leaderboard.ts
│   ├── time-series-leaderboard.ts
│   └── multi-leaderboard.ts

├── NEW - bloom-filters/               // Probabilistic data structures
│   ├── bloom-filter.ts
│   ├── cuckoo-filter.ts
│   └── count-min-sketch.ts
```

**10+ New Features:**

1. Multi-level caching (memory + Redis)
2. Cache warming strategies
3. Cache stampede prevention
4. TTL-based expiration với sliding window
5. Cache compression
6. Distributed session store
7. Real-time pub/sub messaging
8. Job queue với BullMQ
9. Distributed locks với Redlock
10. Rate limiting với sliding window
11. Redis Streams cho event sourcing
12. Leaderboards với sorted sets

---

### 🆕 B. PACKAGES MỚI ĐỀ XUẤT

#### **6. @workflows/engine - NEW** 🎭

**Mục đích:** Workflow orchestration & automation

```typescript
├── core/
│   ├── workflow-engine.ts             // Core execution engine
│   ├── workflow-parser.ts             // Parse workflow definitions
│   ├── state-machine.ts               // State machine implementation
│   └── context-manager.ts             // Workflow context

├── nodes/                             // Workflow node types
│   ├── action-node.ts                 // Execute actions
│   ├── decision-node.ts               // Conditional branching
│   ├── parallel-node.ts               // Parallel execution
│   ├── loop-node.ts                   // Iteration
│   ├── wait-node.ts                   // Delays & timeouts
│   ├── human-node.ts                  // Human approval
│   └── subworkflow-node.ts            // Nested workflows

├── triggers/                          // Workflow triggers
│   ├── webhook-trigger.ts
│   ├── schedule-trigger.ts
│   ├── event-trigger.ts
│   └── manual-trigger.ts

├── actions/                           // Built-in actions
│   ├── send-email.ts
│   ├── send-notification.ts
│   ├── call-api.ts
│   ├── run-query.ts
│   └── execute-tool.ts

├── persistence/
│   ├── workflow-store.ts              // Store workflow definitions
│   ├── execution-store.ts             // Store execution state
│   └── checkpoint-manager.ts          // Checkpointing

├── monitoring/
│   ├── execution-monitor.ts
│   ├── performance-tracker.ts
│   └── error-handler.ts

└── examples/
    ├── approval-workflow.yaml
    ├── data-pipeline.yaml
    └── incident-response.yaml
```

**10+ Features:**

1. Visual workflow builder (YAML/JSON)
2. State persistence với checkpointing
3. Error handling & retry strategies
4. Parallel execution với fan-out/fan-in
5. Conditional branching
6. Human-in-the-loop approvals
7. Timeout & deadline management
8. Workflow versioning
9. Sub-workflow composition
10. Workflow templates
11. Execution history & audit trail
12. Real-time execution monitoring

---

#### **7. @streaming/engine - NEW** ⚡

**Mục đích:** Real-time streaming & WebSocket management

```typescript
├── sse/                               // Server-Sent Events
│   ├── sse-server.ts
│   ├── sse-client.ts
│   ├── sse-stream.ts
│   └── sse-retry.ts

├── websocket/                         // WebSocket
│   ├── ws-server.ts
│   ├── ws-client.ts
│   ├── ws-room-manager.ts
│   ├── ws-presence.ts
│   └── ws-reconnection.ts

├── protocols/                         // Streaming protocols
│   ├── json-streaming.ts
│   ├── ndjson-streaming.ts
│   ├── protobuf-streaming.ts
│   └── custom-protocol.ts

├── backpressure/                      // Flow control
│   ├── backpressure-strategy.ts
│   ├── buffer-manager.ts
│   └── throttle-manager.ts

├── multiplexing/                      // Connection multiplexing
│   ├── stream-multiplexer.ts
│   ├── channel-manager.ts
│   └── priority-queue.ts

├── compression/                       // Stream compression
│   ├── gzip-stream.ts
│   ├── brotli-stream.ts
│   └── compression-negotiation.ts

└── monitoring/
    ├── stream-metrics.ts
    ├── connection-monitor.ts
    └── bandwidth-tracker.ts
```

**10+ Features:**

1. SSE với automatic reconnection
2. WebSocket room management
3. Presence tracking
4. Binary streaming support
5. Stream multiplexing
6. Backpressure handling
7. Compression negotiation
8. Protocol negotiation
9. Stream authentication
10. Connection pooling
11. Bandwidth throttling
12. Stream resumption

---

#### **8. @search/engine - NEW** 🔍

**Mục đích:** Full-text & semantic search

```typescript
├── indexing/
│   ├── document-indexer.ts            // Index documents
│   ├── incremental-indexer.ts         // Real-time indexing
│   ├── batch-indexer.ts               // Bulk indexing
│   └── index-optimizer.ts             // Index optimization

├── queries/
│   ├── query-parser.ts                // Parse search queries
│   ├── query-expander.ts              // Query expansion
│   ├── fuzzy-matcher.ts               // Fuzzy matching
│   └── relevance-scorer.ts            // Scoring algorithms

├── semantic/
│   ├── embeddings-generator.ts        // Generate embeddings
│   ├── similarity-search.ts           // Vector similarity
│   ├── clustering.ts                  // Document clustering
│   └── topic-extraction.ts            // Topic modeling

├── filters/
│   ├── facet-builder.ts               // Faceted search
│   ├── range-filter.ts                // Range queries
│   ├── geo-filter.ts                  // Geo search
│   └── composite-filter.ts            // Complex filters

├── ranking/
│   ├── bm25-ranker.ts                 // BM25 algorithm
│   ├── learning-to-rank.ts            // ML ranking
│   ├── personalized-ranking.ts        // User-specific
│   └── temporal-ranking.ts            // Time-based boost

├── suggestions/
│   ├── autocomplete.ts                // Search suggestions
│   ├── spell-checker.ts               // Spell correction
│   └── did-you-mean.ts                // Query suggestions

└── analytics/
    ├── search-analytics.ts            // Track search behavior
    ├── click-tracking.ts              // Click-through rate
    └── conversion-tracking.ts         // Search success
```

**10+ Features:**

1. Full-text search với Elasticsearch
2. Vector search với embeddings
3. Fuzzy matching & typo tolerance
4. Faceted search
5. Autocomplete suggestions
6. Spell correction
7. Semantic search
8. Personalized ranking
9. Search analytics
10. Query expansion
11. Highlight snippets
12. Multi-language support

---

#### **9. @notifications/service - NEW** 🔔

**Mục đích:** Multi-channel notification system

```typescript
├── channels/
│   ├── email/
│   │   ├── email-sender.ts
│   │   ├── template-engine.ts
│   │   └── smtp-client.ts
│   │
│   ├── sms/
│   │   ├── sms-sender.ts
│   │   └── twilio-client.ts
│   │
│   ├── push/
│   │   ├── push-sender.ts
│   │   ├── fcm-client.ts
│   │   └── apns-client.ts
│   │
│   ├── slack/
│   │   ├── slack-sender.ts
│   │   └── slack-blocks.ts
│   │
│   ├── webhook/
│   │   ├── webhook-sender.ts
│   │   └── webhook-retry.ts
│   │
│   └── in-app/
│       ├── in-app-sender.ts
│       └── notification-center.ts

├── routing/
│   ├── routing-engine.ts              // Route notifications
│   ├── preference-manager.ts          // User preferences
│   └── channel-selector.ts            // Select best channel

├── templates/
│   ├── template-manager.ts            // Template storage
│   ├── template-renderer.ts           // Render templates
│   ├── variable-substitutor.ts        // Variable replacement
│   └── localization.ts                // i18n support

├── scheduling/
│   ├── scheduler.ts                   // Schedule notifications
│   ├── batch-processor.ts             // Batch sending
│   ├── rate-limiter.ts                // Avoid spam
│   └── quiet-hours.ts                 // Respect quiet hours

├── delivery/
│   ├── delivery-tracker.ts            // Track delivery
│   ├── retry-manager.ts               // Retry failed
│   ├── fallback-handler.ts            // Fallback channels
│   └── delivery-receipt.ts            // Delivery confirmation

└── analytics/
    ├── notification-analytics.ts      // Track metrics
    ├── engagement-tracker.ts          // Open/click rates
    └── ab-testing.ts                  // A/B test templates
```

**10+ Features:**

1. Multi-channel delivery (email, SMS, push, Slack)
2. Template management với Handlebars
3. User preference management
4. Notification scheduling
5. Batch notification processing
6. Delivery tracking & receipts
7. Retry với exponential backoff
8. Channel fallback strategies
9. Rate limiting per channel
10. Quiet hours enforcement
11. A/B testing templates
12. i18n support

---

#### **10. @analytics/engine - NEW** 📊

**Mục đích:** Advanced analytics & reporting

```typescript
├── collectors/
│   ├── event-collector.ts             // Collect events
│   ├── metric-collector.ts            // Collect metrics
│   └── log-collector.ts               // Collect logs

├── aggregators/
│   ├── time-series-aggregator.ts      // Time-based aggregation
│   ├── group-by-aggregator.ts         // Grouping
│   ├── percentile-aggregator.ts       // Percentiles
│   └── custom-aggregator.ts           // Custom logic

├── pipelines/
│   ├── pipeline-builder.ts            // Build pipelines
│   ├── pipeline-executor.ts           // Execute pipelines
│   ├── stream-processor.ts            // Real-time processing
│   └── batch-processor.ts             // Batch processing

├── visualizations/
│   ├── chart-generator.ts             // Generate charts
│   ├── dashboard-builder.ts           // Build dashboards
│   ├── report-generator.ts            // Generate reports
│   └── export-manager.ts              // Export data

├── predictive/
│   ├── forecasting.ts                 // Time series forecasting
│   ├── anomaly-detection.ts           // Detect anomalies
│   ├── trend-analysis.ts              // Identify trends
│   └── recommendation-engine.ts       // Recommendations

├── queries/
│   ├── query-builder.ts               // Build analytical queries
│   ├── query-optimizer.ts             // Optimize queries
│   └── query-cache.ts                 // Cache results

└── reporting/
    ├── scheduled-reports.ts           // Schedule reports
    ├── report-distribution.ts         // Distribute reports
    └── report-templates.ts            // Report templates
```

**10+ Features:**

1. Event tracking infrastructure
2. Real-time metric aggregation
3. Custom dashboards
4. Scheduled reports
5. Predictive analytics
6. Anomaly detection
7. Funnel analysis
8. Cohort analysis
9. A/B test analysis
10. User segmentation
11. Retention analysis
12. Revenue analytics

---

#### **11. @integrations/hub - NEW** 🔗

**Mục đích:** Centralized integration management

```typescript
├── connectors/
│   ├── slack/
│   │   ├── slack-connector.ts
│   │   ├── slack-oauth.ts
│   │   └── slack-events.ts
│   │
│   ├── jira/
│   │   ├── jira-connector.ts
│   │   ├── jira-webhooks.ts
│   │   └── jira-sync.ts
│   │
│   ├── github/
│   │   ├── github-connector.ts
│   │   ├── github-webhooks.ts
│   │   └── github-actions.ts
│   │
│   ├── salesforce/
│   │   ├── salesforce-connector.ts
│   │   └── salesforce-sync.ts
│   │
│   └── custom/
│       ├── http-connector.ts
│       ├── graphql-connector.ts
│       └── soap-connector.ts

├── oauth/
│   ├── oauth-manager.ts               // Manage OAuth flows
│   ├── token-manager.ts               // Token refresh
│   └── provider-registry.ts           // OAuth providers

├── webhooks/
│   ├── webhook-receiver.ts            // Receive webhooks
│   ├── webhook-validator.ts           // Validate signatures
│   ├── webhook-router.ts              // Route to handlers
│   └── webhook-retry.ts               // Retry failed webhooks

├── sync/
│   ├── sync-engine.ts                 // Bi-directional sync
│   ├── conflict-resolver.ts           // Resolve conflicts
│   ├── change-tracker.ts              // Track changes
│   └── sync-scheduler.ts              // Schedule syncs

├── mapping/
│   ├── field-mapper.ts                // Map fields
│   ├── transformer.ts                 // Transform data
│   └── schema-matcher.ts              // Match schemas

└── monitoring/
    ├── integration-health.ts          // Monitor health
    ├── sync-monitor.ts                // Monitor syncs
    └── error-tracker.ts               // Track errors
```

**10+ Features:**

1. Pre-built connectors (Slack, Jira, GitHub, Salesforce)
2. OAuth 2.0 flow management
3. Webhook receiving & validation
4. Bi-directional data sync
5. Conflict resolution strategies
6. Field mapping & transformation
7. Rate limit handling
8. Retry với exponential backoff
9. Integration health monitoring
10. Event-driven integrations
11. Custom connector framework
12. Integration marketplace

---

#### **12. @billing/service - NEW** 💳

**Mục đích:** Usage tracking & billing

```typescript
├── metering/
│   ├── usage-meter.ts                 // Meter usage
│   ├── token-counter.ts               // Count tokens
│   ├── cost-calculator.ts             // Calculate costs
│   └── usage-aggregator.ts            // Aggregate usage

├── billing/
│   ├── invoice-generator.ts           // Generate invoices
│   ├── payment-processor.ts           // Process payments
│   ├── subscription-manager.ts        // Manage subscriptions
│   └── credit-manager.ts              // Manage credits

├── pricing/
│   ├── pricing-engine.ts              // Calculate prices
│   ├── tier-manager.ts                // Manage tiers
│   ├── discount-manager.ts            // Apply discounts
│   └── promo-code-manager.ts          // Promo codes

├── reporting/
│   ├── usage-report.ts                // Usage reports
│   ├── billing-report.ts              // Billing reports
│   ├── cost-analysis.ts               // Cost analysis
│   └── forecast.ts                    // Cost forecasting

├── integrations/
│   ├── stripe-integration.ts          // Stripe
│   ├── paypal-integration.ts          // PayPal
│   └── custom-gateway.ts              // Custom payment

└── alerts/
    ├── budget-alert.ts                // Budget alerts
    ├── usage-alert.ts                 // Usage alerts
    └── billing-alert.ts               // Billing alerts
```

**10+ Features:**

1. Token usage metering
2. Cost calculation per request
3. Subscription management
4. Invoice generation
5. Payment processing (Stripe)
6. Usage reports
7. Budget alerts
8. Tiered pricing
9. Discount codes
10. Cost forecasting
11. Refund management
12. Tax calculation

---

## 🏛️ PHẦN 3: KIẾN TRÚC THỐNG NHẤT V3

### 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                          │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ Web UI   │ Mobile   │   CLI    │  VS Code │  API     │      │
│  │ (React)  │  (RN)    │  (Node)  │ Extension│ Clients  │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
└─────────────────────────────────────────────────────────────────┘
                             ↓ HTTP/WS
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Kong / Nginx / Traefik                                    │  │
│  │ • Rate Limiting  • Auth  • CORS  • Compression           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                 UNIFIED GATEWAY API v3                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/v3/*                                               │   │
│  │  ┌────────────┬────────────┬────────────┬────────────┐  │   │
│  │  │ REST API   │ GraphQL    │    SSE     │ WebSocket  │  │   │
│  │  │ Endpoints  │  Gateway   │  Streaming │   Server   │  │   │
│  │  └────────────┴────────────┴────────────┴────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION SERVICES                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │ Chat     │ Workflow │ Search   │ Notif    │ Billing  │      │
│  │ Orchestr.│ Engine   │ Engine   │ Service  │ Service  │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │PostgreSQL│  Redis   │Elasticsearch│ Vector │  S3     │      │
│  │    DB    │  Cache   │   Search  │   DB    │ Storage  │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │OpenRouter│ Anthropic│  Stripe  │  Slack   │  GitHub  │      │
│  │   LLM    │   API    │ Payments │   API    │   API    │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

### 🗂️ API v3 Route Structure

```typescript
/api/v3/
│
├── /auth                          // Authentication & Authorization
│   ├── POST   /login              // Login with email/password
│   ├── POST   /logout             // Logout
│   ├── POST   /register           // Register new user
│   ├── POST   /refresh            // Refresh JWT token
│   ├── POST   /verify-email       // Verify email
│   ├── POST   /forgot-password    // Request password reset
│   ├── POST   /reset-password     // Reset password
│   ├── POST   /mfa/enable         // Enable 2FA
│   ├── POST   /mfa/verify         // Verify 2FA code
│   ├── GET    /oauth/providers    // List OAuth providers
│   └── GET    /oauth/:provider    // OAuth redirect
│
├── /users                         // User Management
│   ├── GET    /                   // List users (admin)
│   ├── POST   /                   // Create user (admin)
│   ├── GET    /me                 // Get current user
│   ├── PATCH  /me                 // Update current user
│   ├── DELETE /me                 // Delete account
│   ├── GET    /:id                // Get user by ID (admin)
│   ├── PATCH  /:id                // Update user (admin)
│   ├── DELETE /:id                // Delete user (admin)
│   ├── GET    /:id/sessions       // List user sessions
│   ├── DELETE /:id/sessions/:sid  // Revoke session
│   ├── GET    /:id/api-keys       // List API keys
│   ├── POST   /:id/api-keys       // Create API key
│   └── DELETE /:id/api-keys/:kid  // Revoke API key
│
├── /conversations                 // Conversations
│   ├── GET    /                   // List conversations
│   ├── POST   /                   // Create conversation
│   ├── GET    /:id                // Get conversation
│   ├── PATCH  /:id                // Update conversation
│   ├── DELETE /:id                // Delete conversation
│   ├── POST   /:id/summarize      // Generate summary
│   ├── POST   /:id/share          // Share conversation
│   ├── GET    /:id/export         // Export conversation
│   └── POST   /:id/fork           // Fork conversation
│
├── /messages                      // Messages
│   ├── GET    /conversations/:cid/messages     // List messages
│   ├── POST   /conversations/:cid/messages     // Send message
│   ├── GET    /conversations/:cid/messages/:id // Get message
│   ├── PATCH  /conversations/:cid/messages/:id // Edit message
│   ├── DELETE /conversations/:cid/messages/:id // Delete message
│   ├── POST   /conversations/:cid/messages/:id/react    // React
│   └── POST   /conversations/:cid/messages/:id/pin      // Pin
│
├── /chat                          // Chat & Streaming
│   ├── POST   /                   // Send chat message (non-streaming)
│   ├── POST   /stream             // Stream chat (SSE)
│   ├── POST   /completions        // Raw LLM completion
│   └── WS     /ws                 // WebSocket chat
│
├── /tools                         // Tool Management
│   ├── GET    /                   // List all tools
│   ├── POST   /                   // Register tool (admin)
│   ├── GET    /:name              // Get tool details
│   ├── PATCH  /:name              // Update tool (admin)
│   ├── DELETE /:name              // Delete tool (admin)
│   ├── POST   /:name/execute      // Execute tool
│   ├── POST   /:name/validate     // Validate tool input
│   ├── GET    /:name/usage        // Tool usage stats
│   └── GET    /:name/versions     // Tool versions
│
├── /workflows                     // Workflow Orchestration
│   ├── GET    /                   // List workflows
│   ├── POST   /                   // Create workflow
│   ├── GET    /:id                // Get workflow
│   ├── PATCH  /:id                // Update workflow
│   ├── DELETE /:id                // Delete workflow
│   ├── POST   /:id/execute        // Execute workflow
│   ├── GET    /:id/executions     // List executions
│   ├── GET    /:id/executions/:eid // Get execution details
│   ├── POST   /:id/executions/:eid/pause  // Pause execution
│   ├── POST   /:id/executions/:eid/resume // Resume execution
│   └── POST   /:id/executions/:eid/cancel // Cancel execution
│
├── /admin                         // Admin Operations
│   ├── /users
│   │   ├── GET    /               // List all users
│   │   ├── PATCH  /:id/role       // Change user role
│   │   ├── POST   /:id/suspend    // Suspend user
│   │   └── POST   /:id/activate   // Activate user
│   │
│   ├── /policies
│   │   ├── GET    /               // List policies
│   │   ├── POST   /               // Create policy
│   │   ├── GET    /:id            // Get policy
│   │   ├── PATCH  /:id            // Update policy
│   │   └── DELETE /:id            // Delete policy
│   │
│   ├── /roles
│   │   ├── GET    /               // List roles
│   │   ├── POST   /               // Create role
│   │   ├── GET    /:id            // Get role
│   │   ├── PATCH  /:id            // Update role
│   │   └── DELETE /:id            // Delete role
│   │
│   └── /system
│       ├── GET    /health         // System health
│       ├── GET    /metrics        // System metrics
│       ├── POST   /maintenance    // Enable maintenance mode
│       └── GET    /config         // View config
│
├── /search                        // Search & Analytics
│   ├── POST   /                   // Universal search
│   ├── POST   /conversations      // Search conversations
│   ├── POST   /messages           // Search messages
│   ├── POST   /users              // Search users
│   ├── POST   /semantic           // Semantic search
│   ├── GET    /suggestions        // Autocomplete suggestions
│   └── GET    /trending           // Trending searches
│
├── /files                         // File Management
│   ├── GET    /                   // List files
│   ├── POST   /upload             // Upload file
│   ├── GET    /:id                // Download file
│   ├── DELETE /:id                // Delete file
│   ├── GET    /:id/preview        // Preview file
│   ├── POST   /:id/share          // Share file
│   └── GET    /:id/metadata       // Get metadata
│
├── /notifications                 // Notifications
│   ├── GET    /                   // List notifications
│   ├── POST   /                   // Create notification
│   ├── GET    /:id                // Get notification
│   ├── PATCH  /:id/read           // Mark as read
│   ├── DELETE /:id                // Delete notification
│   ├── POST   /mark-all-read      // Mark all read
│   └── GET    /preferences        // Get user preferences
│
├── /integrations                  // External Integrations
│   ├── GET    /                   // List integrations
│   ├── POST   /                   // Create integration
│   ├── GET    /:id                // Get integration
│   ├── PATCH  /:id                // Update integration
│   ├── DELETE /:id                // Delete integration
│   ├── POST   /:id/test           // Test integration
│   ├── GET    /:id/logs           // Integration logs
│   └── POST   /:id/sync           // Trigger sync
│
├── /webhooks                      // Webhook Management
│   ├── GET    /                   // List webhooks
│   ├── POST   /                   // Create webhook
│   ├── GET    /:id                // Get webhook
│   ├── PATCH  /:id                // Update webhook
│   ├── DELETE /:id                // Delete webhook
│   ├── POST   /:id/test           // Test webhook
│   └── GET    /:id/deliveries     // Delivery logs
│
├── /billing                       // Billing & Usage
│   ├── GET    /usage              // Current usage
│   ├── GET    /invoices           // List invoices
│   ├── GET    /invoices/:id       // Get invoice
│   ├── POST   /subscription       // Create subscription
│   ├── PATCH  /subscription       // Update subscription
│   ├── DELETE /subscription       // Cancel subscription
│   ├── POST   /payment-methods    // Add payment method
│   └── GET    /credits            // Get credit balance
│
├── /monitoring                    // Observability
│   ├── /health
│   │   ├── GET    /               // Overall health
│   │   ├── GET    /database       // Database health
│   │   ├── GET    /cache          // Cache health
│   │   └── GET    /providers      // LLM provider health
│   │
│   ├── /metrics
│   │   ├── GET    /               // All metrics
│   │   ├── GET    /latency        // Latency metrics
│   │   ├── GET    /throughput     // Throughput metrics
│   │   ├── GET    /errors         // Error metrics
│   │   └── GET    /costs          // Cost metrics
│   │
│   ├── /traces
│   │   ├── GET    /               // List traces
│   │   ├── GET    /:id            // Get trace
│   │   └── GET    /:id/spans      // Get spans
│   │
│   └── /logs
│       ├── GET    /               // Search logs
│       └── WS     /stream         // Stream logs
│
└── /audit                         // Audit & Compliance
    ├── GET    /events             // List audit events
    ├── GET    /events/:id         // Get event details
    ├── POST   /reports            // Generate audit report
    ├── GET    /reports/:id        // Get report
    └── GET    /compliance         // Compliance status
```

**Total v3 Endpoints: ~200+ endpoints**

---

## 🗓️ PHẦN 4: ROADMAP TRIỂN KHAI CHI TIẾT

### **Phase 0: Preparation (Week 1-2)** 🎯

**Goals:**

- Set up unified project structure
- Establish coding standards
- Create migration plan

**Tasks:**

1. **Project Setup**

   ```bash
   # Create unified workspace
   - Setup monorepo với Turborepo/Nx
   - Configure TypeScript strict mode
   - Setup ESLint + Prettier
   - Configure Husky pre-commit hooks
   ```

2. **Documentation**

   ```markdown
   - API Design Document (OpenAPI 3.1)
   - Database Schema Design
   - Architecture Decision Records (ADRs)
   - Migration Guide v1/v2 → v3
   ```

3. **Infrastructure**

   ```bash
   - Setup development environment
   - Configure Docker Compose
   - Setup CI/CD pipelines
   - Provision staging environment
   ```

4. **Team Alignment**

   ```markdown
   - Kickoff meeting
   - Sprint planning
   - Assign responsibilities
   - Setup communication channels
   ```

**Deliverables:**

- ✅ Unified monorepo structure
- ✅ OpenAPI v3 specification
- ✅ Database schema v3
- ✅ CI/CD pipelines
- ✅ Development environment ready

---

### **Phase 1: Foundation & Core Services (Week 3-6)** 🏗️

**Goals:**

- Migrate core packages
- Build foundation services
- Establish data layer

**Week 3-4: Core Packages**

```typescript
// Tasks
1
. @domain/core enhancements
   - Add new domain models (workflow, notification, webhook, etc.)
   - Implement domain services
   - Add value objects
   - Unit tests coverage >90%

2. @contracts/shared expansion
   - Define all v3 DTOs
   - Create Zod schemas
   - Generate OpenAPI types
   - Add branded types for IDs

3. @config/core upgrade
   - Implement feature flags
   - Add dynamic config loader
   - Setup secrets management
   - Environment validation

4. @infra/postgres enhancement
   - New repositories (workflow, webhook, team, etc.)
   - Query builder implementation
   - Migration framework
   - Connection pooling optimization
   - Test coverage >85%

5. @infra/redis upgrade
   - Multi-level cache
   - Distributed locks (Redlock)
   - Pub/Sub implementation
   - Rate limiting with sliding window
   - Job queue setup (BullMQ)
```

**Week 5-6: API Foundation**

```typescript
// Gateway API v3 Core
1. Setup Fastify server
   - Plugin architecture
   - Error handling middleware
   - Request logging
   - Correlation ID tracking

2. Authentication & Authorization
   - JWT implementation
   - Refresh token rotation
   - RBAC middleware
   - API key validation
   - Session management

3. Core Routes Migration
   - /auth/* (7 endpoints)
   - /users/* (12 endpoints)
   - /health (1 endpoint)
   - /metrics (basic)

4. Database Layer
   - Connection pooling
   - Transaction management
   - Repository pattern
   - Query optimization

5. Testing Setup
   - Integration test framework
   - Test fixtures
   - Mock services
   - Load testing setup
```

**Deliverables:**

- ✅ Enhanced core packages deployed
- ✅ Authentication system working
- ✅ Basic API routes operational
- ✅ Database migrations completed
- ✅ Test coverage >80%

---

### **Phase 2: Conversation & Messaging (Week 7-10)** 💬

**Goals:**

- Full conversation management
- Real-time messaging
- Streaming support

**Week 7-8: Conversations**

```typescript
1. Conversation Management
   - GET /conversations (with filters, pagination)
   - POST /conversations
   - GET /conversations/:id
   - PATCH /conversations/:id
   - DELETE /conversations/:id
   - POST /conversations/:id/summarize (AI-powered)
   - POST /conversations/:id/share
   - GET /conversations/:id/export (PDF/MD/JSON)
   - POST /conversations/:id/fork

2. Conversation Features
   - Folders & categories
   - Tags & labels
   - Search & filters
   - Bookmarks
   - Templates
   - Permissions

3. Database Schema
   CREATE TABLE conversations (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     title VARCHAR(255),
     topic VARCHAR(100),
     summary TEXT,
     folder_id UUID,
     tags TEXT[],
     message_count INT DEFAULT 0,
     is_shared BOOLEAN DEFAULT false,
     share_link VARCHAR(100),
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );
```

**Week 9-10: Messaging & Streaming**

```typescript
1. Message Operations
   - GET /conversations/:id/messages
   - POST /conversations/:id/messages
   - PATCH /conversations/:id/messages/:mid
   - DELETE /conversations/:id/messages/:mid
   - POST /conversations/:id/messages/:mid/react
   - POST /conversations/:id/messages/:mid/pin

2. Streaming Implementation (@streaming/engine)
   - Server-Sent Events (SSE)
   - POST /chat/stream
   - Token-by-token streaming
   - Error handling in streams
   - Backpressure handling
   - Connection recovery

3. WebSocket Support
   - WS /chat/ws
   - Room management
   - Presence tracking
   - Typing indicators
   - Read receipts

4. Message Features
   - Rich text formatting (Markdown)
   - Code syntax highlighting
   - File attachments
   - Mentions (@username)
   - Reactions (emoji)
   - Threading
   - Message editing/deletion
```

**Deliverables:**

- ✅ Full conversation CRUD
- ✅ Real-time messaging working
- ✅ SSE streaming operational
- ✅ WebSocket chat functional
- ✅ Message features complete

---

### **Phase 3: Tool & Workflow Orchestration (Week 11-14)** 🛠️

**Goals:**

- Enhanced tool management
- Workflow engine implementation
- Tool marketplace foundation

**Week 11-12: Tool Management**

```typescript
1. Tool Registry Enhancement
   - GET /tools (with search, filters)
   - POST /tools (admin only)
   - GET /tools/:name
   - PATCH /tools/:name
   - DELETE /tools/:name
   - POST /tools/:name/execute
   - POST /tools/:name/validate
   - GET /tools/:name/usage
   - GET /tools/:name/versions

2. Tool Features
   - Tool categories
   - Tool permissions
   - Usage analytics
   - Tool versioning
   - Tool sandboxing
   - Timeout controls
   - Cost tracking per tool
   - Tool documentation

3. Tool Execution Engine
   - Input validation (Zod)
   - Execution isolation
   - Resource limits
   - Error handling
   - Result caching
   - Retry logic
   - Parallel execution
```

**Week 13-14: Workflow Engine (@workflows/engine)**

```typescript
1. Workflow Core
   - Workflow parser (YAML/JSON)
   - State machine implementation
   - Execution engine
   - Context management
   - Checkpoint/resume

2. Workflow Nodes
   - Action nodes (execute tools)
   - Decision nodes (if/else)
   - Parallel nodes (fan-out/fan-in)
   - Loop nodes (iteration)
   - Wait nodes (delays)
   - Human approval nodes
   - Sub-workflow nodes

3. Workflow API
   - GET /workflows
   - POST /workflows
   - POST /workflows/:id/execute
   - GET /workflows/:id/executions
   - POST /workflows/:id/executions/:eid/pause
   - POST /workflows/:id/executions/:eid/resume
   - POST /workflows/:id/executions/:eid/cancel

4. Workflow Features
   - Visual builder (drag-drop)
   - Workflow templates
   - Error handling strategies
   - Retry policies
   - Timeout management
   - Execution history
   - Real-time monitoring
   - Workflow versioning
```

**Deliverables:**

- ✅ Enhanced tool management
- ✅ Workflow engine operational
- ✅ Tool marketplace foundation
- ✅ 10+ workflow templates
- ✅ Tool sandboxing working

---

### **Phase 4: Search & Analytics (Week 15-18)** 🔍

**Goals:**

- Full-text search implementation
- Semantic search
- Analytics dashboard

**Week 15-16: Search Engine (@search/engine)**

```typescript
1. Elasticsearch Setup
   - Cluster configuration
   - Index mappings
   - Analyzer configuration
   - Replication setup

2. Indexing Pipeline
   - Real-time indexing
   - Batch indexing
   - Index optimization
   - Reindexing strategy

3. Search API
   - POST /search (universal)
   - POST /search/conversations
   - POST /search/messages
   - POST /search/users
   - POST /search/semantic
   - GET /search/suggestions (autocomplete)
   - GET /search/trending

4. Search Features
   - Full-text search
   - Fuzzy matching
   - Faceted search
   - Filters & sorting
   - Highlighting
   - Spell correction
   - Query expansion
   - Personalized ranking
   - Multi-language support

5. Semantic Search
   - Embedding generation (OpenAI)
   - Vector storage (Qdrant/Pinecone)
   - Similarity search
   - Hybrid search (text + semantic)
```

**Week 17-18: Analytics Engine (@analytics/engine)**

```typescript
1. Analytics Infrastructure
   - Event tracking
   - Metric collection
   - Data aggregation
   - Time-series storage

2. Analytics API
   - GET /monitoring/metrics/*
   - POST /admin/reports
   - GET /search/analytics

3. Dashboards
   - Usage dashboard
   - Cost dashboard
   - Performance dashboard
   - User engagement dashboard
   - Tool analytics dashboard
   - Search analytics dashboard

4. Reports
   - Scheduled reports
   - Custom reports
   - Export to PDF/CSV
   - Email delivery
   - Report templates

5. Analytics Features
   - Real-time metrics
   - Predictive analytics
   - Anomaly detection
   - Trend analysis
   - Funnel analysis
   - Cohort analysis
   - A/B testing framework
   - User segmentation
```

**Deliverables:**

- ✅ Full-text search working
- ✅ Semantic search operational
- ✅ Analytics dashboards live
- ✅ 5+ default reports
- ✅ Real-time metrics streaming

---

### **Phase 5: Integrations & Notifications (Week 19-22)** 🔗

**Goals:**

- Multi-channel notifications
- External integrations
- Webhook system

**Week 19-20: Notification Service (@notifications/service)**

```typescript
1. Notification Channels
   - Email (SMTP/SendGrid)
   - SMS (Twilio)
   - Push (FCM/APNS)
   - Slack
   - In-app
   - Webhooks

2. Notification API
   - GET /notifications
   - POST /notifications
   - GET /notifications/:id
   - PATCH /notifications/:id/read
   - DELETE /notifications/:id
   - POST /notifications/mark-all-read
   - GET /notifications/preferences
   - PATCH /notifications/preferences

3. Notification Features
   - Template management (Handlebars)
   - User preferences
   - Notification scheduling
   - Batch processing
   - Delivery tracking
   - Retry with backoff
   - Channel fallback
   - Rate limiting
   - Quiet hours
   - A/B testing templates
   - i18n support

4. Notification Types
   - System notifications
   - User mentions
   - Tool execution results
   - Workflow status
   - Policy violations
   - Cost alerts
   - Security alerts
```

**Week 21-22: Integrations Hub (@integrations/hub)**

```typescript
1. OAuth Management
   - OAuth 2.0 flows
   - Token management
   - Token refresh
   - Provider registry

2. Connectors
   - Slack connector
   - Jira connector
   - GitHub connector
   - Salesforce connector
   - Google Drive connector
   - Microsoft Teams connector
   - Custom HTTP connector
   - GraphQL connector

3. Integration API
   - GET /integrations
   - POST /integrations
   - GET /integrations/:id
   - PATCH /integrations/:id
   - DELETE /integrations/:id
   - POST /integrations/:id/test
   - GET /integrations/:id/logs
   - POST /integrations/:id/sync

4. Webhook Management
   - GET /webhooks
   - POST /webhooks
   - GET /webhooks/:id
   - PATCH /webhooks/:id
   - DELETE /webhooks/:id
   - POST /webhooks/:id/test
   - GET /webhooks/:id/deliveries

5. Integration Features
   - Bi-directional sync
   - Conflict resolution
   - Field mapping
   - Data transformation
   - Webhook validation (HMAC)
   - Retry policies
   - Rate limit handling
   - Health monitoring
```

**Deliverables:**

- ✅ 6+ notification channels working
- ✅ 6+ integrations live
- ✅ Webhook system operational
- ✅ OAuth flows complete
- ✅ Integration marketplace ready

---

### **Phase 6: Admin & Governance (Week 23-26)** 👥

**Goals:**

- Complete admin panel
- Policy enforcement
- Billing system

**Week 23-24: Admin Panel**

```typescript
1. User Management
   - GET /admin/users
   - POST /admin/users
   - PATCH /admin/users/:id
   - DELETE /admin/users/:id
   - PATCH /admin/users/:id/role
   - POST /admin/users/:id/suspend
   - POST /admin/users/:id/activate
   - POST /admin/users/bulk-import

2. Role Management
   - GET /admin/roles
   - POST /admin/roles
   - GET /admin/roles/:id
   - PATCH /admin/roles/:id
   - DELETE /admin/roles/:id
   - PATCH /admin/roles/:id/permissions

3. Policy Management
   - GET /admin/policies
   - POST /admin/policies
   - GET /admin/policies/:id
   - PATCH /admin/policies/:id
   - DELETE /admin/policies/:id
   - POST /admin/policies/:id/simulate

4. System Management
   - GET /admin/system/health
   - GET /admin/system/metrics
   - POST /admin/system/maintenance
   - GET /admin/system/config
   - PATCH /admin/system/config
   - POST /admin/system/cache/clear

5. Admin Features
   - User impersonation
   - Audit trail viewer
   - Batch operations
   - Activity monitoring
   - System diagnostics
   - Configuration editor
   - Feature flag management
```

**Week 25-26: Billing System (@billing/service)**

```typescript
1. Usage Metering
   - Token counting
   - Cost calculation
   - Usage aggregation
   - Real-time tracking

2. Billing API
   - GET /billing/usage
   - GET /billing/invoices
   - GET /billing/invoices/:id
   - POST /billing/subscription
   - PATCH /billing/subscription
   - DELETE /billing/subscription
   - POST /billing/payment-methods
   - GET /billing/credits

3. Stripe Integration
   - Payment processing
   - Subscription management
   - Invoice generation
   - Webhook handling
   - Refund processing

4. Billing Features
   - Tiered pricing
   - Usage-based billing
   - Discount codes
   - Promo codes
   - Credit system
   - Budget alerts
   - Cost forecasting
   - Tax calculation
   - Multi-currency support

5. Reports
   - Usage reports
   - Billing reports
   - Cost analysis
   - Revenue analytics
   - Forecast reports
```

**Deliverables:**

- ✅ Complete admin panel
- ✅ Policy engine enforcing
- ✅ Billing system live
- ✅ Stripe integration working
- ✅ Usage tracking accurate

---

### **Phase 7: Security & Compliance (Week 27-30)** 🛡️

**Goals:**

- Enterprise security features
- Compliance certifications
- Audit & compliance tools

**Week 27-28: Security Enhancements**

```typescript
1. Advanced Authentication
   - Multi-factor authentication (2FA)
   - Biometric authentication (WebAuthn)
   - SSO integration (SAML, OIDC)
   - OAuth 2.0 providers
   - Passwordless login (magic links)

2. Security Features
   - End-to-end encryption
   - Data encryption at rest
   - TLS 1.3 enforcement
   - Security headers (HSTS, CSP)
   - IP whitelisting/blacklisting
   - Rate limiting enhancements
   - DDoS protection
   - Brute force detection

3. Secrets Management
   - HashiCorp Vault integration
   - Secret rotation automation
   - Encrypted secrets storage
   - Audit trail for secrets

4. Threat Detection
   - Anomaly detection
   - Suspicious activity alerts
   - SQL injection prevention
   - XSS protection
   - CSRF protection
```

**Week 29-30: Compliance & Audit**

```typescript
1. Data Privacy
   - GDPR compliance
     • Right to be forgotten
     • Right to data portability
     • Consent management
     • Privacy policy versioning
   - HIPAA compliance
   - SOC 2 compliance
   - ISO 27001 alignment

2. Data Loss Prevention (DLP)
   - PII detection & redaction
   - Sensitive data scanning
   - Export controls
   - Watermarking

3. Audit System
   - GET /audit/events
   - GET /audit/events/:id
   - POST /audit/reports
   - GET /audit/reports/:id
   - GET /audit/compliance

4. Audit Features
   - Tamper-proof logs
   - Log retention policies
   - Forensic analysis
   - Compliance reports
   - Automated compliance checks
   - Incident response workflows

5. Backup & Recovery
   - Automated backups
   - Point-in-time recovery
   - Disaster recovery testing
   - Backup encryption
   - Backup verification
```

**Deliverables:**

- ✅ 2FA implemented
- ✅ SSO integration complete
- ✅ GDPR compliance achieved
- ✅ SOC 2 audit ready
- ✅ Audit system operational

---

### **Phase 8: Performance & Scale (Week 31-34)** ⚡

**Goals:**

- Performance optimization
- Scalability improvements
- Load testing

**Week 31-32: Performance Optimization**

```typescript
1. Database Optimization
   - Query optimization
   - Index tuning
   - Partitioning strategy
   - Read replica setup
   - Connection pooling tuning
   - Query result caching

2. Caching Strategy
   - Multi-level caching (L1 + L2)
   - Cache warming
   - Cache stampede prevention
   - Cache invalidation strategies
   - Redis cluster setup

3. API Optimization
   - Response compression (gzip/brotli)
   - HTTP/2 support
   - Connection keep-alive
   - Request batching
   - GraphQL data loader

4. Frontend Optimization
   - Code splitting
   - Lazy loading
   - Image optimization
   - CDN integration
   - Service worker caching
```

**Week 33-34: Scalability & Load Testing**

```typescript
1. Horizontal Scaling
   - Load balancer setup (Nginx/HAProxy)
   - Auto-scaling policies
   - Health check endpoints
   - Graceful shutdown

2. Microservices Architecture
   - Service decomposition plan
   - API Gateway (Kong)
   - Service mesh (Istio)
   - Inter-service communication

3. Message Queue
   - RabbitMQ/Kafka setup
   - Event-driven architecture
   - Asynchronous processing
   - Dead letter queues

4. Load Testing
   - k6 load tests
   - Stress testing
   - Spike testing
   - Soak testing
   - Performance benchmarks

5. Monitoring Enhancement
   - Distributed tracing (Jaeger)
   - APM (Application Performance Monitoring)
   - Real-time alerting
   - Capacity planning
```

**Performance Targets:**

- ✅ p95 latency < 200ms (non-LLM)
- ✅ p99 latency < 2s (with LLM)
- ✅ Support 10,000 concurrent users
- ✅ 99.9% uptime SLA
- ✅ Error rate < 0.1%

---

### **Phase 9: Documentation & Developer Experience (Week 35-36)** 📚

**Goals:**

- Complete documentation
- Developer portal
- SDK development

**Week 35: Documentation**

```typescript
1. API Documentation
   - OpenAPI 3.1 spec (100% coverage)
   - Swagger UI
   - Redoc
   - Postman collections
   - Code examples (curl, JavaScript, Python)

2. User Guides
   - Getting started guide
   - Authentication guide
   - Streaming guide
   - Workflow guide
   - Integration guide
   - Best practices

3. Developer Docs
   - Architecture overview
   - Database schema
   - API reference
   - SDK documentation
   - Contributing guide
   - Troubleshooting guide

4. Video Tutorials
   - Quick start video
   - Feature walkthroughs
   - Integration tutorials
   - Advanced topics
```

**Week 36: Developer Portal & SDKs**

```typescript
1. Developer Portal
   - API Explorer (interactive)
   - Code playground
   - API key management
   - Usage dashboard
   - Support tickets
   - Community forum

2. Official SDKs
   - JavaScript/TypeScript SDK
   - Python SDK
   - Go SDK
   - API client generators

3. Code Examples
   - Example applications
   - Integration examples
   - Use case tutorials
   - Sample workflows

4. Community Resources
   - GitHub repository
   - Stack Overflow tag
   - Discord community
   - Blog with tutorials
```

**Deliverables:**

- ✅ Complete API documentation
- ✅ Developer portal live
- ✅ 3+ official SDKs
- ✅ 10+ code examples
- ✅ Video tutorials published

---

### **Phase 10: Beta Testing & Launch (Week 37-40)** 🚀

**Goals:**

- Beta testing program
- Bug fixing
- Production launch

**Week 37: Beta Testing**

```typescript
1. Beta Program
   - Recruit 50 beta testers
   - Setup feedback channels
   - Create beta documentation
   - Provide beta support

2. Testing Focus Areas
   - Authentication flows
   - Streaming performance
   - Workflow execution
   - Search accuracy
   - Notification delivery
   - Integration stability
   - Billing accuracy
   - Mobile experience

3. Metrics Collection
   - Error tracking (Sentry)
   - Performance monitoring
   - User behavior analytics
   - Conversion funnels
   - Feature usage stats
```

**Week 38-39: Bug Fixes & Refinement**

```typescript
1. Priority Issues
   - Critical bugs (P0)
   - High priority bugs (P1)
   - Medium priority bugs (P2)
   - Performance issues
   - UX improvements

2. Final Polish
   - UI/UX refinements
   - Copy improvements
   - Error message clarity
   - Loading states
   - Empty states
   - Accessibility fixes

3. Security Audit
   - Penetration testing
   - Vulnerability scanning
   - Code review
   - Dependency audit
   - Security best practices check
```

**Week 40: Production Launch**

```typescript
1. Pre-Launch Checklist
   - [ ] All tests passing
   - [ ] Security audit complete
   - [ ] Performance benchmarks met
   - [ ] Documentation complete
   - [ ] Backup systems tested
   - [ ] Monitoring setup
   - [ ] Incident response plan
   - [ ] Support team trained
   - [ ] Marketing materials ready

2. Launch Activities
   - Database migration v1/v2 → v3
   - Gradual rollout (feature flags)
   - Monitor key metrics
   - On-call rotation setup
   - Launch announcement
   - Social media promotion
   - Email to existing users

3. Post-Launch
   - Monitor error rates
   - Track performance metrics
   - Gather user feedback
   - Hot-fix critical issues
   - Celebrate success! 🎉
```

**Success Metrics:**

- ✅ 95% of beta testers satisfied
- ✅ <10 critical bugs at launch
- ✅ 99.9% uptime in first week
- ✅ <200ms p95 latency
- ✅ Positive user feedback

---

## 📊 RESOURCE ALLOCATION

### Team Structure

```
Product Team (3 people)
├── Product Manager (1)
├── UX Designer (1)
└── Technical Writer (1)

Engineering Team (8 people)
├── Backend Engineers (4)
│   ├── Lead Backend (1) - Architecture
│   ├── API Engineer (1) - REST/GraphQL
│   ├── Infrastructure (1) - DevOps
│   └── Services Engineer (1) - Microservices
│
├── Frontend Engineers (2)
│   ├── Web UI (1)
│   └── Mobile (1)
│
├── ML/AI Engineer (1) - Embeddings, semantic search
└── QA Engineer (1) - Testing

Total: 11 people
```

### Technology Stack

**Backend:**

- Node.js 20+ / Bun
- TypeScript 5.3+
- Fastify (HTTP server)
- Socket.io (WebSocket)
- BullMQ (Job queue)

**Database:**

- PostgreSQL 16+
- Redis 7+
- Elasticsearch 8+
- Qdrant (Vector DB)

**Observability:**

- Prometheus + Grafana
- Jaeger (Tracing)
- Loki (Logs)
- Sentry (Errors)

**Infrastructure:**

- Docker + Kubernetes
- AWS / GCP
- Terraform (IaC)
- GitHub Actions (CI/CD)

---

## 💰 ESTIMATED COSTS

### Development Costs (10 months)

| Item | Cost | Notes |
|------|------|-------|
| Engineering Team | $800,000 | 8 engineers × $100k/year × 10 months |
| Product Team | $200,000 | 3 people × $80k/year × 10 months |
| Infrastructure (Dev/Staging) | $10,000 | AWS/GCP costs |
| Tools & Licenses | $5,000 | GitHub, Figma, etc. |
| **Total** | **$1,015,000** | |

### Ongoing Costs (Monthly)

| Item | Monthly Cost | Notes |
|------|--------------|-------|
| Production Infrastructure | $5,000 | Load balancers, servers, storage |
| Database Hosting | $2,000 | Managed PostgreSQL, Redis |
| LLM API Costs | $3,000 | OpenRouter, Anthropic |
| Monitoring & Logging | $500 | Datadog, Sentry |
| CDN & Storage | $500 | CloudFront, S3 |
| **Total** | **$11,000/month** | $132,000/year |

---

## 🎯 SUCCESS CRITERIA

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Uptime | 99.9% | Pingdom, StatusPage |
| p95 Latency (non-LLM) | <200ms | Prometheus |
| p99 Latency (with LLM) | <2s | Prometheus |
| Error Rate | <0.1% | Sentry |
| Test Coverage | >80% | Jest, Vitest |
| Security Score | A+ | Mozilla Observatory |

### Business Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Beta User Adoption | 500 users | Week 37 |
| Production Users | 5,000 users | Month 12 |
| API Requests/Day | 1M requests | Month 12 |
| Revenue (ARR) | $500k | Month 18 |
| Customer Satisfaction | >4.5/5 | Ongoing |
| Net Promoter Score | >50 | Ongoing |

---

## 🚨 RISK MANAGEMENT

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM API Rate Limits | High | Medium | Multiple provider fallback |
| Database Performance | High | Low | Read replicas, caching |
| Migration Issues | High | Medium | Gradual rollout, rollback plan |
| Security Breach | Critical | Low | Security audits, penetration testing |
| Scaling Issues | Medium | Medium | Load testing, auto-scaling |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Budget Overrun | High | Medium | Agile budgeting, phase gates |
| Timeline Delays | Medium | High | Buffer time, MVP approach |
| Low Adoption | High | Medium | Beta program, user feedback |
| Competitor Launch | Medium | Medium | Differentiation, faster iteration |

---

## ✅ NEXT STEPS

### Immediate Actions (Week 1)

1. **Stakeholder Approval**
   - Present roadmap to leadership
   - Get budget approval
   - Secure team resources

2. **Team Formation**
   - Hire/assign team members
   - Setup communication channels (Slack, Jira)
   - Kickoff meeting

3. **Technical Setup**
   - Create GitHub repos
   - Setup CI/CD pipelines
   - Provision development environment

4. **Planning**
   - Create detailed sprint plans
   - Setup project tracking (Jira/Linear)
   - Define success metrics

### Week 2 Deliverables

- ✅ Team fully staffed
- ✅ Development environment ready
- ✅ First sprint planned
- ✅ Architecture decisions documented
- ✅ Ready to start Phase 1

---

**🎉 Bắt đầu hành trình xây dựng Gateway API v3!**

Bạn muốn tôi deep-dive vào phần nào cụ thể?

- Chi tiết implementation của package nào?
- Database schema chi tiết?
- Deployment architecture?
- Testing strategy?
