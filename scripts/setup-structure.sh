#!/bin/bash

# Apps
mkdir -p apps/api/src/{routes/{v1,v2,workflows,admin},middleware,adapters,websocket}
mkdir -p apps/gateway-mcp/src/{handlers,transport}
mkdir -p apps/gateway-cli/src/{commands,utils}

# Packages - Domain
mkdir -p packages/domain/src/core/{entities,value-objects,services,errors}
mkdir -p packages/domain/src/{incident,change,compliance,knowledge,automation}

# Packages - Application
mkdir -p packages/application/src/{core,incident,change,compliance,knowledge,automation}

# Packages - Contracts
mkdir -p packages/contracts/src/{llm,mcp,repositories,events}

# Packages - Config
mkdir -p packages/config/src

# Packages - Infrastructure
mkdir -p packages/infra-postgres/src/{repositories,migrations}
mkdir -p packages/infra-redis/src
mkdir -p packages/infra-vector/src

# Packages - Providers
mkdir -p packages/providers/src

# Packages - Tools
mkdir -p packages/tools/src/core-tools

# Packages - MCP Servers (Core)
mkdir -p packages/mcp-servers/core/log-aggregator/src/{connectors,tools}
mkdir -p packages/mcp-servers/core/sql-ops/src/{tools,validators}
mkdir -p packages/mcp-servers/core/network-change/src
mkdir -p packages/mcp-servers/core/config-validator/src
mkdir -p packages/mcp-servers/core/compliance-doc/src
mkdir -p packages/mcp-servers/core/asset-inventory/src

# Packages - MCP Servers (Advanced)
mkdir -p packages/mcp-servers/advanced/{incident-learner,predictive,knowledge-base,shift-handover,collaboration,benchmark,change-approval,anonymizer,nl-sql,config-gen,debug-assistant,scheduler,workflow-builder,maintenance}/src

# Packages - Observability
mkdir -p packages/observability/src

# Packages - Security
mkdir -p packages/security/src/{rbac,crypto,allowlist,audit}

# Packages - Testing
mkdir -p packages/testing/src/{fixtures,mocks,helpers}

# Scripts
mkdir -p scripts

# Docs
mkdir -p docs/{architecture/{adr,diagrams},api,mcp,runbooks}

# Add .gitkeep to all empty folders
find . -type d -empty -exec touch {}/.gitkeep \;

echo "✅ Folder structure created!"
