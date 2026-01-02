import { trace, context, SpanStatusCode, Tracer } from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'

export interface TracingConfig {
    serviceName: string
    serviceVersion: string
    jaegerEndpoint?: string
    enabled: boolean
}

export class TracingService {
    private tracer: Tracer
    private provider?: NodeTracerProvider

    constructor(config: TracingConfig) {
        if (!config.enabled) {
            this.tracer = trace.getTracer('noop')
            return
        }

        // Create resource
        const resource = Resource.default().merge(
            new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
                [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
            })
        )

        // Create provider
        this.provider = new NodeTracerProvider({
            resource,
        })

        // Configure exporter
        if (config.jaegerEndpoint) {
            const exporter = new JaegerExporter({
                endpoint: config.jaegerEndpoint,
            })

            this.provider.addSpanProcessor(new BatchSpanProcessor(exporter))
        }

        // Register provider
        this.provider.register()

        // Get tracer
        this.tracer = trace.getTracer(config.serviceName, config.serviceVersion)
    }

    // Trace SSE streaming
    traceSseStream<T>(
        conversationId: string,
        fn: () => Promise<T>
    ): Promise<T> {
        return this.traceOperation('sse.stream', fn, {
            'conversation.id': conversationId,
        })
    }

    // Trace chat request
    traceChatRequest<T>(
        userId: string,
        tier: string,
        fn: () => Promise<T>
    ): Promise<T> {
        return this.traceOperation('chat.request', fn, {
            'user.id': userId,
            'chat.tier': tier,
        })
    }

    // Trace summarization
    traceSummarization<T>(
        conversationId: string,
        messageCount: number,
        fn: () => Promise<T>
    ): Promise<T> {
        return this.traceOperation('conversation.summarize', fn, {
            'conversation.id': conversationId,
            'message.count': messageCount,
        })
    }

    // Trace MCP tool call
    traceMcpToolCall<T>(
        toolName: string,
        fn: () => Promise<T>
    ): Promise<T> {
        return this.traceOperation('mcp.tool.call', fn, {
            'tool.name': toolName,
        })
    }

    // Trace database operation
    traceDbOperation<T>(
        operation: string,
        table: string,
        fn: () => Promise<T>
    ): Promise<T> {
        return this.traceOperation('db.operation', fn, {
            'db.operation': operation,
            'db.table': table,
        })
    }

    // Trace cache operation
    traceCacheOperation<T>(
        operation: string,
        key: string,
        fn: () => Promise<T>
    ): Promise<T> {
        return this.traceOperation('cache.operation', fn, {
            'cache.operation': operation,
            'cache.key': key,
        })
    }

    // Generic trace operation
    private async traceOperation<T>(
        spanName: string,
        fn: () => Promise<T>,
        attributes: Record<string, string | number> = {}
    ): Promise<T> {
        const span = this.tracer.startSpan(spanName, {
            attributes,
        })

        const activeContext = trace.setSpan(context.active(), span)

        try {
            const result = await context.with(activeContext, fn)
            span.setStatus({ code: SpanStatusCode.OK })
            return result
        } catch (error: any) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            })
            span.recordException(error)
            throw error
        } finally {
            span.end()
        }
    }

    // Sync version for non-async operations
    traceSync<T>(
        spanName: string,
        fn: () => T,
        attributes: Record<string, string | number> = {}
    ): T {
        const span = this.tracer.startSpan(spanName, {
            attributes,
        })

        try {
            const result = fn()
            span.setStatus({ code: SpanStatusCode.OK })
            return result
        } catch (error: any) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            })
            span.recordException(error)
            throw error
        } finally {
            span.end()
        }
    }

    async shutdown(): Promise<void> {
        await this.provider?.shutdown()
    }
}

// Factory function
export function createTracingService(config: TracingConfig): TracingService {
    return new TracingService(config)
}
