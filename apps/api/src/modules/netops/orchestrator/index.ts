/**
 * Orchestrator Module Index
 * Re-exports all orchestrator components
 */

// Types
export * from './types.js'

// Context Builder
export {
    resolveScope,
    buildContextPack,
    computeConfigDigest,
    computeDeltaDigest,
    getCachedContextPack,
    setCachedContextPack,
    generateCacheKey,
    invalidateContextPackCache,
    type ScopeResolverOptions,
    type BuildContextPackOptions,
    type ConfigDigest
} from './context-builder.js'

// State Machine
export {
    canTransitionTo,
    getValidNextStatuses,
    isTerminalStatus,
    getNextLayer,
    getPreviousLayer,
    getLayerIndex,
    isLayerCompleted,
    canProceedToNextLayer,
    calculateRequiredApprovals,
    assessRiskLevel,
    OrchestrationStateMachine,
    type GuardResult
} from './state-machine.js'

// LLM Schemas
export {
    taskGraphSchema,
    expertOutputSchema,
    judgeVerdictSchema,
    PLANNER_SYSTEM_PROMPT,
    EXPERT_SYSTEM_PROMPT,
    JUDGE_SYSTEM_PROMPT,
    buildPlannerPrompt,
    buildExpertPrompt,
    buildJudgePrompt,
    type TaskGraphOutput,
    type ExpertOutputResult,
    type JudgeVerdictResult
} from './llm-schemas.js'

// LLM Wrapper
export {
    NetOpsLLMWrapper,
    MockLLMClient,
    getNetOpsLLMWrapper,
    resetNetOpsLLMWrapper,
    type LLMConfig,
    type LLMClient,
    type LLMRequest,
    type LLMResponse
} from './llm-wrapper.js'

// Orchestrator
export {
    NetOpsOrchestrator,
    type OrchestrationRepository,
    type OrchestratorConfig
} from './orchestrator.js'
