/**
 * Requests Module - Fastify Routes
 * HTTP endpoints for asset request and approval management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RequestsService } from './requests.service.js';
import {
    createRequestSchema,
    updateRequestSchema,
    submitRequestSchema,
    approveRequestSchema,
    rejectRequestSchema,
    requestMoreInfoSchema,
    provideInfoSchema,
    cancelRequestSchema,
    startFulfillmentSchema,
    fulfillRequestSchema,
    addAttachmentSchema,
    addCommentSchema,
    escalateApprovalSchema,
    createTemplateSchema,
    updateTemplateSchema,
    requestListQuerySchema,
    approvalQueueQuerySchema,
    fulfillmentQueueQuerySchema,
    requestIdParamSchema,
    templateIdParamSchema,
    attachmentIdParamSchema
} from './requests.schemas.js';

export async function requestsRoutes(
    fastify: FastifyInstance,
    options: { requestsService: RequestsService }
): Promise<void> {
    const { requestsService } = options;

    // ==================== Request CRUD ====================

    // Create request
    fastify.post('/requests', async (request: FastifyRequest, reply: FastifyReply) => {
        const parseResult = createRequestSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.createRequest(parseResult.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.status(201).send(result.request);
    });

    // Get all requests with filtering
    fastify.get('/requests', async (request: FastifyRequest, reply: FastifyReply) => {
        const parseResult = requestListQuerySchema.safeParse(request.query);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.getRequests({
            ...parseResult.data,
            requesterId: parseResult.data.requesterId || undefined,
            departmentId: parseResult.data.departmentId || undefined,
            assetCategoryId: parseResult.data.assetCategoryId || undefined,
            organizationId: parseResult.data.organizationId || undefined,
            submittedFrom: parseResult.data.submittedFrom || undefined,
            submittedTo: parseResult.data.submittedTo || undefined,
            requiredDateFrom: parseResult.data.requiredDateFrom || undefined,
            requiredDateTo: parseResult.data.requiredDateTo || undefined
        });
        return reply.send(result);
    });

    // Get request by ID
    fastify.get('/requests/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const result = await requestsService.getRequestWithDetails(paramResult.data.id);
        if (!result) {
            return reply.status(404).send({ error: 'Request not found' });
        }

        return reply.send(result);
    });

    // Get full request detail
    fastify.get('/requests/:id/detail', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const result = await requestsService.getRequestDetail(paramResult.data.id);
        if (!result) {
            return reply.status(404).send({ error: 'Request not found' });
        }

        return reply.send(result);
    });

    // Update request
    fastify.patch('/requests/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const bodyResult = updateRequestSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: bodyResult.error.errors
            });
        }

        // TODO: Get user ID from auth
        const updatedBy = (request.body as { updatedBy?: string }).updatedBy || 'system';

        const result = await requestsService.updateRequest(
            paramResult.data.id,
            bodyResult.data,
            updatedBy
        );
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.send(result.request);
    });

    // Delete request
    fastify.delete('/requests/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        // TODO: Get user ID from auth
        const deletedBy = (request.query as { deletedBy?: string }).deletedBy || 'system';

        const result = await requestsService.deleteRequest(paramResult.data.id, deletedBy);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.status(204).send();
    });

    // ==================== Submission ====================

    // Submit request for approval
    fastify.post('/requests/:id/submit', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const body = request.body as { submittedBy?: string };
        const submittedBy = body.submittedBy;
        if (!submittedBy) {
            return reply.status(400).send({ error: 'submittedBy is required' });
        }

        const result = await requestsService.submitRequest({
            requestId: paramResult.data.id,
            submittedBy
        });

        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.send(result.request);
    });

    // ==================== Approval Workflow ====================

    // Approve request
    fastify.post('/requests/:id/approve', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const body = request.body as { approverId: string; comments?: string };
        const parseResult = approveRequestSchema.safeParse({
            requestId: paramResult.data.id,
            ...body
        });
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.approveRequest(parseResult.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.send({
            step: result.step,
            isFullyApproved: result.isFullyApproved,
            nextStep: result.nextStep
        });
    });

    // Reject request
    fastify.post('/requests/:id/reject', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const body = request.body as { approverId: string; reason: string };
        const parseResult = rejectRequestSchema.safeParse({
            requestId: paramResult.data.id,
            ...body
        });
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.rejectRequest(parseResult.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.send({ step: result.step });
    });

    // Request more info
    fastify.post('/requests/:id/request-info', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const body = request.body as { approverId: string; question: string };
        const parseResult = requestMoreInfoSchema.safeParse({
            requestId: paramResult.data.id,
            ...body
        });
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.requestMoreInfo(parseResult.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.send({ step: result.step });
    });

    // Provide info response
    fastify.post('/requests/:id/provide-info', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const body = request.body as { commentId: string; response: string; respondedBy: string };
        const parseResult = provideInfoSchema.safeParse({
            requestId: paramResult.data.id,
            ...body
        });
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.provideInfo(parseResult.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.send(result.request);
    });

    // Cancel request
    fastify.post('/requests/:id/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const body = request.body as { cancelledBy: string; reason?: string };
        const parseResult = cancelRequestSchema.safeParse({
            requestId: paramResult.data.id,
            ...body
        });
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.cancelRequest(parseResult.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.send(result.request);
    });

    // ==================== Fulfillment ====================

    // Start fulfillment
    fastify.post('/requests/:id/start-fulfillment', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const body = request.body as { startedBy: string };
        const parseResult = startFulfillmentSchema.safeParse({
            requestId: paramResult.data.id,
            ...body
        });
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.startFulfillment(parseResult.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.send(result.request);
    });

    // Fulfill request
    fastify.post('/requests/:id/fulfill', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const body = request.body as { assetIds: string[]; fulfilledBy: string; notes?: string };
        const parseResult = fulfillRequestSchema.safeParse({
            requestId: paramResult.data.id,
            ...body
        });
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.fulfillRequest(parseResult.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.send({
            request: result.request,
            checkoutIds: result.checkoutIds
        });
    });

    // Get fulfillment queue
    fastify.get('/requests/fulfillment-queue', async (request: FastifyRequest, reply: FastifyReply) => {
        const parseResult = fulfillmentQueueQuerySchema.safeParse(request.query);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.getFulfillmentQueue({
            ...parseResult.data,
            assetCategoryId: parseResult.data.assetCategoryId || undefined,
            departmentId: parseResult.data.departmentId || undefined,
            organizationId: parseResult.data.organizationId || undefined
        });
        return reply.send(result);
    });

    // ==================== Approval Queue ====================

    // Get approval queue for user
    fastify.get('/requests/approval-queue', async (request: FastifyRequest, reply: FastifyReply) => {
        const parseResult = approvalQueueQuerySchema.safeParse(request.query);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.getApprovalQueue(parseResult.data.approverId);
        return reply.send({ data: result });
    });

    // Get approval steps for request
    fastify.get('/requests/:id/approval-steps', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const result = await requestsService.getApprovalSteps(paramResult.data.id);
        return reply.send({ data: result });
    });

    // Escalate approval step
    fastify.post('/approval-steps/:stepId/escalate', async (request: FastifyRequest, reply: FastifyReply) => {
        const params = request.params as { stepId: string };
        const body = request.body as { newApproverId: string; reason: string; escalatedBy: string };

        const parseResult = escalateApprovalSchema.safeParse({
            stepId: params.stepId,
            ...body
        });
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.escalateApproval(parseResult.data);
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.send(result.step);
    });

    // ==================== Attachments ====================

    // Add attachment
    fastify.post('/requests/:id/attachments', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const body = request.body as {
            fileName: string;
            filePath: string;
            fileSize?: number;
            fileType?: string;
            uploadedBy: string;
            description?: string;
        };
        const parseResult = addAttachmentSchema.safeParse({
            requestId: paramResult.data.id,
            ...body
        });
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        try {
            const result = await requestsService.addAttachment(parseResult.data);
            return reply.status(201).send(result);
        } catch (error) {
            return reply.status(400).send({
                error: error instanceof Error ? error.message : 'Failed to add attachment'
            });
        }
    });

    // Get attachments
    fastify.get('/requests/:id/attachments', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const result = await requestsService.getAttachments(paramResult.data.id);
        return reply.send({ data: result });
    });

    // Delete attachment
    fastify.delete('/requests/:id/attachments/:attachmentId', async (request: FastifyRequest, reply: FastifyReply) => {
        const params = request.params as { id: string; attachmentId: string };
        const attachmentParamResult = attachmentIdParamSchema.safeParse({ attachmentId: params.attachmentId });
        if (!attachmentParamResult.success) {
            return reply.status(400).send({
                error: 'Invalid attachment ID',
                details: attachmentParamResult.error.errors
            });
        }

        // TODO: Get user ID from auth
        const deletedBy = (request.query as { deletedBy?: string }).deletedBy || 'system';

        const result = await requestsService.deleteAttachment(
            attachmentParamResult.data.attachmentId,
            deletedBy
        );
        if (!result.success) {
            return reply.status(400).send({ error: result.error });
        }

        return reply.status(204).send();
    });

    // ==================== Comments ====================

    // Add comment
    fastify.post('/requests/:id/comments', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const body = request.body as {
            content: string;
            authorId: string;
            commentType?: string;
            approvalStepId?: string;
            parentCommentId?: string;
        };
        const parseResult = addCommentSchema.safeParse({
            requestId: paramResult.data.id,
            ...body
        });
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.addComment(parseResult.data);
        return reply.status(201).send(result);
    });

    // Get comments
    fastify.get('/requests/:id/comments', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const result = await requestsService.getComments(paramResult.data.id);
        return reply.send({ data: result });
    });

    // ==================== Audit Logs ====================

    // Get audit logs
    fastify.get('/requests/:id/audit-logs', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = requestIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid request ID',
                details: paramResult.error.errors
            });
        }

        const result = await requestsService.getAuditLogs(paramResult.data.id);
        return reply.send({ data: result });
    });

    // ==================== Templates ====================

    // Create template
    fastify.post('/approval-templates', async (request: FastifyRequest, reply: FastifyReply) => {
        const parseResult = createTemplateSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: parseResult.error.errors
            });
        }

        const result = await requestsService.createTemplate({
            ...parseResult.data,
            steps: parseResult.data.steps.map(step => ({
                ...step,
                approverId: step.approverId || undefined
            }))
        });
        return reply.status(201).send(result);
    });

    // Get all active templates
    fastify.get('/approval-templates', async (request: FastifyRequest, reply: FastifyReply) => {
        const query = request.query as { organizationId?: string };
        const result = await requestsService.getActiveTemplates(query.organizationId);
        return reply.send({ data: result });
    });

    // Get template by ID
    fastify.get('/approval-templates/:templateId', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = templateIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid template ID',
                details: paramResult.error.errors
            });
        }

        const result = await requestsService.getTemplateById(paramResult.data.templateId);
        if (!result) {
            return reply.status(404).send({ error: 'Template not found' });
        }

        return reply.send(result);
    });

    // Update template
    fastify.patch('/approval-templates/:templateId', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = templateIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid template ID',
                details: paramResult.error.errors
            });
        }

        const bodyResult = updateTemplateSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: bodyResult.error.errors
            });
        }

        const result = await requestsService.updateTemplate(
            paramResult.data.templateId,
            {
                ...bodyResult.data,
                steps: bodyResult.data.steps ? bodyResult.data.steps.map(step => ({
                    ...step,
                    approverId: step.approverId || undefined
                })) : undefined
            }
        );
        if (!result) {
            return reply.status(404).send({ error: 'Template not found' });
        }

        return reply.send(result);
    });

    // Delete template
    fastify.delete('/approval-templates/:templateId', async (request: FastifyRequest, reply: FastifyReply) => {
        const paramResult = templateIdParamSchema.safeParse(request.params);
        if (!paramResult.success) {
            return reply.status(400).send({
                error: 'Invalid template ID',
                details: paramResult.error.errors
            });
        }

        const result = await requestsService.deleteTemplate(paramResult.data.templateId);
        if (!result) {
            return reply.status(404).send({ error: 'Template not found' });
        }

        return reply.status(204).send();
    });

    // ==================== Statistics ====================

    // Get request statistics
    fastify.get('/requests/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
        const query = request.query as { organizationId?: string };
        const result = await requestsService.getStatistics(query.organizationId);
        return reply.send(result);
    });

    // ==================== My Requests ====================

    // Get my requests
    fastify.get('/requests/my', async (request: FastifyRequest, reply: FastifyReply) => {
        const query = request.query as { requesterId: string } & Partial<Record<string, unknown>>;
        if (!query.requesterId) {
            return reply.status(400).send({ error: 'requesterId is required' });
        }

        const result = await requestsService.getMyRequests(query.requesterId, query);
        return reply.send({ data: result });
    });
}
