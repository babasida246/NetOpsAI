/**
 * Requests Module - Repository Layer
 * Database operations for asset request and approval management
 */

import { Pool, PoolClient } from 'pg';
import {
    AssetRequest,
    AssetRequestWithDetails,
    ApprovalStep,
    ApprovalStepWithDetails,
    RequestAttachment,
    RequestAttachmentWithDetails,
    RequestComment,
    RequestCommentWithDetails,
    RequestAuditLog,
    RequestAuditLogWithDetails,
    ApprovalChainTemplate,
    ApprovalChainStep,
    CreateRequestDto,
    UpdateRequestDto,
    AddAttachmentDto,
    AddCommentDto,
    RequestListQuery,
    ApprovalQueueQuery,
    FulfillmentQueueQuery,
    RequestStatus,
    ApprovalStatus,
    RequestStatistics
} from './requests.types.js';

// ==================== Helper Functions ====================

function mapRowToRequest(row: Record<string, unknown>): AssetRequest {
    return {
        id: row.id as string,
        requestCode: row.request_code as string,
        requestType: row.request_type as AssetRequest['requestType'],
        requesterId: row.requester_id as string,
        departmentId: row.department_id as string | null,
        assetCategoryId: row.asset_category_id as string | null,
        assetModelId: row.asset_model_id as string | null,
        quantity: Number(row.quantity ?? 1),
        currentAssetId: row.current_asset_id as string | null,
        justification: row.justification as string,
        priority: row.priority as AssetRequest['priority'],
        requiredDate: row.required_date as string | null,
        status: row.status as AssetRequest['status'],
        approvalChain: row.approval_chain as ApprovalChainStep[] | null,
        totalApprovalSteps: Number(row.total_approval_steps ?? 0),
        currentApprovalStep: Number(row.current_approval_step ?? 0),
        fulfilledBy: row.fulfilled_by as string | null,
        fulfilledAt: row.fulfilled_at as Date | null,
        fulfilledAssetIds: row.fulfilled_asset_ids as string[] | null,
        cancelledBy: row.cancelled_by as string | null,
        cancelledAt: row.cancelled_at as Date | null,
        cancelReason: row.cancel_reason as string | null,
        rejectedBy: row.rejected_by as string | null,
        rejectedAt: row.rejected_at as Date | null,
        rejectReason: row.reject_reason as string | null,
        submittedAt: row.submitted_at as Date | null,
        organizationId: row.organization_id as string | null,
        createdAt: row.created_at as Date,
        updatedAt: row.updated_at as Date,
        createdBy: row.created_by as string | null
    };
}

function mapRowToRequestWithDetails(row: Record<string, unknown>): AssetRequestWithDetails {
    const base = mapRowToRequest(row);
    return {
        ...base,
        requesterName: row.requester_name as string | null,
        requesterEmail: row.requester_email as string | null,
        departmentName: row.department_name as string | null,
        categoryName: row.category_name as string | null,
        modelName: row.model_name as string | null,
        currentAssetTag: row.current_asset_tag as string | null,
        currentAssetName: row.current_asset_name as string | null,
        approvedSteps: Number(row.approved_steps ?? 0),
        pendingApproverName: row.pending_approver_name as string | null,
        pendingApproverRole: row.pending_approver_role as AssetRequestWithDetails['pendingApproverRole'],
        commentCount: Number(row.comment_count ?? 0),
        attachmentCount: Number(row.attachment_count ?? 0),
        daysWaiting: row.days_waiting != null ? Number(row.days_waiting) : null
    };
}

function mapRowToApprovalStep(row: Record<string, unknown>): ApprovalStep {
    return {
        id: row.id as string,
        requestId: row.request_id as string,
        stepOrder: Number(row.step_order),
        approverId: row.approver_id as string,
        approverRole: row.approver_role as ApprovalStep['approverRole'],
        status: row.status as ApprovalStep['status'],
        decisionDate: row.decision_date as Date | null,
        comments: row.comments as string | null,
        isEscalated: row.is_escalated as boolean,
        escalatedFrom: row.escalated_from as string | null,
        escalatedAt: row.escalated_at as Date | null,
        escalationReason: row.escalation_reason as string | null,
        reminderSentCount: Number(row.reminder_sent_count ?? 0),
        lastReminderSentAt: row.last_reminder_sent_at as Date | null,
        createdAt: row.created_at as Date,
        updatedAt: row.updated_at as Date
    };
}

function mapRowToApprovalStepWithDetails(row: Record<string, unknown>): ApprovalStepWithDetails {
    const base = mapRowToApprovalStep(row);
    return {
        ...base,
        approverName: row.approver_name as string | null,
        approverEmail: row.approver_email as string | null,
        escalatedFromName: row.escalated_from_name as string | null,
        requestCode: row.request_code as string,
        requesterName: row.requester_name as string | null
    };
}

function mapRowToAttachment(row: Record<string, unknown>): RequestAttachment {
    return {
        id: row.id as string,
        requestId: row.request_id as string,
        fileName: row.file_name as string,
        filePath: row.file_path as string,
        fileSize: row.file_size != null ? Number(row.file_size) : null,
        fileType: row.file_type as string | null,
        uploadedBy: row.uploaded_by as string,
        uploadedAt: row.uploaded_at as Date,
        description: row.description as string | null
    };
}

function mapRowToAttachmentWithDetails(row: Record<string, unknown>): RequestAttachmentWithDetails {
    const base = mapRowToAttachment(row);
    return {
        ...base,
        uploadedByName: row.uploaded_by_name as string | null
    };
}

function mapRowToComment(row: Record<string, unknown>): RequestComment {
    return {
        id: row.id as string,
        requestId: row.request_id as string,
        commentType: row.comment_type as RequestComment['commentType'],
        content: row.content as string,
        authorId: row.author_id as string,
        approvalStepId: row.approval_step_id as string | null,
        parentCommentId: row.parent_comment_id as string | null,
        createdAt: row.created_at as Date
    };
}

function mapRowToCommentWithDetails(row: Record<string, unknown>): RequestCommentWithDetails {
    const base = mapRowToComment(row);
    return {
        ...base,
        authorName: row.author_name as string | null,
        authorEmail: row.author_email as string | null,
        parentContent: row.parent_content as string | null
    };
}

function mapRowToAuditLog(row: Record<string, unknown>): RequestAuditLog {
    return {
        id: row.id as string,
        requestId: row.request_id as string,
        eventType: row.event_type as string,
        actorId: row.actor_id as string,
        oldStatus: row.old_status as RequestStatus | null,
        newStatus: row.new_status as RequestStatus | null,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.created_at as Date
    };
}

function mapRowToAuditLogWithDetails(row: Record<string, unknown>): RequestAuditLogWithDetails {
    const base = mapRowToAuditLog(row);
    return {
        ...base,
        actorName: row.actor_name as string | null,
        requestCode: row.request_code as string
    };
}

function mapRowToTemplate(row: Record<string, unknown>): ApprovalChainTemplate {
    return {
        id: row.id as string,
        name: row.name as string,
        description: row.description as string | null,
        assetCategoryId: row.asset_category_id as string | null,
        minValue: row.min_value != null ? Number(row.min_value) : null,
        maxValue: row.max_value != null ? Number(row.max_value) : null,
        departmentId: row.department_id as string | null,
        requestType: row.request_type as ApprovalChainTemplate['requestType'],
        priority: Number(row.priority ?? 0),
        steps: row.steps as ApprovalChainStep[],
        isActive: row.is_active as boolean,
        organizationId: row.organization_id as string | null,
        createdAt: row.created_at as Date,
        updatedAt: row.updated_at as Date,
        createdBy: row.created_by as string | null
    };
}

// ==================== Repository Class ====================

export class RequestsRepository {
    constructor(private pool: Pool) { }

    // ==================== Request CRUD ====================

    async create(
        dto: CreateRequestDto,
        client?: PoolClient
    ): Promise<AssetRequest> {
        const executor = client ?? this.pool;

        const result = await executor.query(
            `INSERT INTO asset_requests (
                request_type, requester_id, department_id, asset_category_id,
                asset_model_id, quantity, current_asset_id, justification,
                priority, required_date, organization_id, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                dto.requestType,
                dto.requesterId,
                dto.departmentId ?? null,
                dto.assetCategoryId ?? null,
                dto.assetModelId ?? null,
                dto.quantity ?? 1,
                dto.currentAssetId ?? null,
                dto.justification,
                dto.priority ?? 'normal',
                dto.requiredDate ?? null,
                dto.organizationId ?? null,
                dto.createdBy
            ]
        );

        return mapRowToRequest(result.rows[0]);
    }

    async findById(id: string): Promise<AssetRequest | null> {
        const result = await this.pool.query(
            `SELECT * FROM asset_requests WHERE id = $1`,
            [id]
        );
        return result.rows[0] ? mapRowToRequest(result.rows[0]) : null;
    }

    async findByIdWithDetails(id: string): Promise<AssetRequestWithDetails | null> {
        const result = await this.pool.query(
            `SELECT 
                r.*,
                u.full_name AS requester_name,
                u.email AS requester_email,
                d.name AS department_name,
                c.name AS category_name,
                m.name AS model_name,
                a.asset_tag AS current_asset_tag,
                a.name AS current_asset_name,
                (SELECT COUNT(*) FROM approval_steps WHERE request_id = r.id AND status = 'approved') AS approved_steps,
                pa.full_name AS pending_approver_name,
                ps.approver_role AS pending_approver_role,
                (SELECT COUNT(*) FROM request_comments WHERE request_id = r.id) AS comment_count,
                (SELECT COUNT(*) FROM request_attachments WHERE request_id = r.id) AS attachment_count,
                CASE WHEN r.submitted_at IS NOT NULL 
                    THEN EXTRACT(DAY FROM NOW() - r.submitted_at)
                    ELSE NULL
                END AS days_waiting
            FROM asset_requests r
            LEFT JOIN users u ON r.requester_id = u.id
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN asset_categories c ON r.asset_category_id = c.id
            LEFT JOIN asset_models m ON r.asset_model_id = m.id
            LEFT JOIN assets a ON r.current_asset_id = a.id
            LEFT JOIN approval_steps ps ON r.id = ps.request_id AND ps.step_order = r.current_approval_step
            LEFT JOIN users pa ON ps.approver_id = pa.id
            WHERE r.id = $1`,
            [id]
        );
        return result.rows[0] ? mapRowToRequestWithDetails(result.rows[0]) : null;
    }

    async findByCode(code: string): Promise<AssetRequest | null> {
        const result = await this.pool.query(
            `SELECT * FROM asset_requests WHERE request_code = $1`,
            [code]
        );
        return result.rows[0] ? mapRowToRequest(result.rows[0]) : null;
    }

    async update(
        id: string,
        dto: UpdateRequestDto,
        client?: PoolClient
    ): Promise<AssetRequest | null> {
        const executor = client ?? this.pool;

        const fields: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (dto.assetCategoryId !== undefined) {
            fields.push(`asset_category_id = $${paramIndex++}`);
            values.push(dto.assetCategoryId);
        }
        if (dto.assetModelId !== undefined) {
            fields.push(`asset_model_id = $${paramIndex++}`);
            values.push(dto.assetModelId);
        }
        if (dto.quantity !== undefined) {
            fields.push(`quantity = $${paramIndex++}`);
            values.push(dto.quantity);
        }
        if (dto.justification !== undefined) {
            fields.push(`justification = $${paramIndex++}`);
            values.push(dto.justification);
        }
        if (dto.priority !== undefined) {
            fields.push(`priority = $${paramIndex++}`);
            values.push(dto.priority);
        }
        if (dto.requiredDate !== undefined) {
            fields.push(`required_date = $${paramIndex++}`);
            values.push(dto.requiredDate);
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const result = await executor.query(
            `UPDATE asset_requests 
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *`,
            values
        );

        return result.rows[0] ? mapRowToRequest(result.rows[0]) : null;
    }

    async updateStatus(
        id: string,
        status: RequestStatus,
        additionalFields?: Record<string, unknown>,
        client?: PoolClient
    ): Promise<AssetRequest | null> {
        const executor = client ?? this.pool;

        let query = `UPDATE asset_requests SET status = $1`;
        const values: unknown[] = [status];
        let paramIndex = 2;

        if (additionalFields) {
            for (const [key, value] of Object.entries(additionalFields)) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                query += `, ${snakeKey} = $${paramIndex++}`;
                values.push(value);
            }
        }

        values.push(id);
        query += ` WHERE id = $${paramIndex} RETURNING *`;

        const result = await executor.query(query, values);
        return result.rows[0] ? mapRowToRequest(result.rows[0]) : null;
    }

    async delete(id: string, client?: PoolClient): Promise<boolean> {
        const executor = client ?? this.pool;
        const result = await executor.query(
            `DELETE FROM asset_requests WHERE id = $1`,
            [id]
        );
        return result.rowCount !== null && result.rowCount > 0;
    }

    // ==================== Request Queries ====================

    async findAll(
        query: RequestListQuery
    ): Promise<{ data: AssetRequestWithDetails[]; total: number }> {
        const conditions: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        // Build WHERE conditions
        if (query.status) {
            const statuses = Array.isArray(query.status) ? query.status : [query.status];
            conditions.push(`r.status = ANY($${paramIndex++})`);
            values.push(statuses);
        }

        if (query.requestType) {
            const types = Array.isArray(query.requestType) ? query.requestType : [query.requestType];
            conditions.push(`r.request_type = ANY($${paramIndex++})`);
            values.push(types);
        }

        if (query.priority) {
            const priorities = Array.isArray(query.priority) ? query.priority : [query.priority];
            conditions.push(`r.priority = ANY($${paramIndex++})`);
            values.push(priorities);
        }

        if (query.requesterId) {
            conditions.push(`r.requester_id = $${paramIndex++}`);
            values.push(query.requesterId);
        }

        if (query.departmentId) {
            conditions.push(`r.department_id = $${paramIndex++}`);
            values.push(query.departmentId);
        }

        if (query.assetCategoryId) {
            conditions.push(`r.asset_category_id = $${paramIndex++}`);
            values.push(query.assetCategoryId);
        }

        if (query.organizationId) {
            conditions.push(`r.organization_id = $${paramIndex++}`);
            values.push(query.organizationId);
        }

        if (query.submittedFrom) {
            conditions.push(`r.submitted_at >= $${paramIndex++}`);
            values.push(query.submittedFrom);
        }

        if (query.submittedTo) {
            conditions.push(`r.submitted_at <= $${paramIndex++}`);
            values.push(query.submittedTo);
        }

        if (query.requiredDateFrom) {
            conditions.push(`r.required_date >= $${paramIndex++}`);
            values.push(query.requiredDateFrom);
        }

        if (query.requiredDateTo) {
            conditions.push(`r.required_date <= $${paramIndex++}`);
            values.push(query.requiredDateTo);
        }

        if (query.search) {
            conditions.push(`(
                r.request_code ILIKE $${paramIndex} OR
                r.justification ILIKE $${paramIndex} OR
                u.full_name ILIKE $${paramIndex}
            )`);
            values.push(`%${query.search}%`);
            paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Build ORDER BY
        const sortColumn = {
            created_at: 'r.created_at',
            submitted_at: 'r.submitted_at',
            required_date: 'r.required_date',
            priority: `CASE r.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'normal' THEN 3 
                WHEN 'low' THEN 4 END`,
            status: 'r.status'
        }[query.sortBy ?? 'created_at'];
        const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

        // Pagination
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = (page - 1) * limit;

        // Count query
        const countResult = await this.pool.query(
            `SELECT COUNT(*) FROM asset_requests r
            LEFT JOIN users u ON r.requester_id = u.id
            ${whereClause}`,
            values
        );
        const total = parseInt(countResult.rows[0].count, 10);

        // Main query
        values.push(limit, offset);
        const result = await this.pool.query(
            `SELECT 
                r.*,
                u.full_name AS requester_name,
                u.email AS requester_email,
                d.name AS department_name,
                c.name AS category_name,
                m.name AS model_name,
                a.asset_tag AS current_asset_tag,
                a.name AS current_asset_name,
                (SELECT COUNT(*) FROM approval_steps WHERE request_id = r.id AND status = 'approved') AS approved_steps,
                pa.full_name AS pending_approver_name,
                ps.approver_role AS pending_approver_role,
                (SELECT COUNT(*) FROM request_comments WHERE request_id = r.id) AS comment_count,
                (SELECT COUNT(*) FROM request_attachments WHERE request_id = r.id) AS attachment_count,
                CASE WHEN r.submitted_at IS NOT NULL 
                    THEN EXTRACT(DAY FROM NOW() - r.submitted_at)
                    ELSE NULL
                END AS days_waiting
            FROM asset_requests r
            LEFT JOIN users u ON r.requester_id = u.id
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN asset_categories c ON r.asset_category_id = c.id
            LEFT JOIN asset_models m ON r.asset_model_id = m.id
            LEFT JOIN assets a ON r.current_asset_id = a.id
            LEFT JOIN approval_steps ps ON r.id = ps.request_id AND ps.step_order = r.current_approval_step
            LEFT JOIN users pa ON ps.approver_id = pa.id
            ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            values
        );

        return {
            data: result.rows.map(mapRowToRequestWithDetails),
            total
        };
    }

    async findByRequesterId(
        requesterId: string,
        query?: Partial<RequestListQuery>
    ): Promise<AssetRequestWithDetails[]> {
        const result = await this.findAll({ ...query, requesterId });
        return result.data;
    }

    async findPendingByApprover(approverId: string): Promise<AssetRequestWithDetails[]> {
        const result = await this.pool.query(
            `SELECT 
                r.*,
                u.full_name AS requester_name,
                u.email AS requester_email,
                d.name AS department_name,
                c.name AS category_name,
                m.name AS model_name,
                NULL AS current_asset_tag,
                NULL AS current_asset_name,
                (SELECT COUNT(*) FROM approval_steps WHERE request_id = r.id AND status = 'approved') AS approved_steps,
                pa.full_name AS pending_approver_name,
                ps.approver_role AS pending_approver_role,
                (SELECT COUNT(*) FROM request_comments WHERE request_id = r.id) AS comment_count,
                (SELECT COUNT(*) FROM request_attachments WHERE request_id = r.id) AS attachment_count,
                EXTRACT(DAY FROM NOW() - r.submitted_at) AS days_waiting
            FROM asset_requests r
            JOIN approval_steps ps ON r.id = ps.request_id
            LEFT JOIN users u ON r.requester_id = u.id
            LEFT JOIN users pa ON ps.approver_id = pa.id
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN asset_categories c ON r.asset_category_id = c.id
            LEFT JOIN asset_models m ON r.asset_model_id = m.id
            WHERE r.status = 'pending_approval'
              AND ps.step_order = r.current_approval_step
              AND ps.status = 'pending'
              AND ps.approver_id = $1
            ORDER BY 
                CASE r.priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'normal' THEN 3 
                    WHEN 'low' THEN 4 
                END,
                r.submitted_at ASC`,
            [approverId]
        );

        return result.rows.map(mapRowToRequestWithDetails);
    }

    async findReadyForFulfillment(
        query?: FulfillmentQueueQuery
    ): Promise<{ data: AssetRequestWithDetails[]; total: number }> {
        const conditions: string[] = [`r.status IN ('approved', 'fulfilling')`];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (query?.status) {
            conditions.push(`r.status = $${paramIndex++}`);
            values.push(query.status);
        }

        if (query?.assetCategoryId) {
            conditions.push(`r.asset_category_id = $${paramIndex++}`);
            values.push(query.assetCategoryId);
        }

        if (query?.departmentId) {
            conditions.push(`r.department_id = $${paramIndex++}`);
            values.push(query.departmentId);
        }

        if (query?.organizationId) {
            conditions.push(`r.organization_id = $${paramIndex++}`);
            values.push(query.organizationId);
        }

        if (query?.priority) {
            const priorities = Array.isArray(query.priority) ? query.priority : [query.priority];
            conditions.push(`r.priority = ANY($${paramIndex++})`);
            values.push(priorities);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const sortColumn = {
            submitted_at: 'r.submitted_at',
            priority: `CASE r.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'normal' THEN 3 
                WHEN 'low' THEN 4 END`,
            required_date: 'r.required_date'
        }[query?.sortBy ?? 'submitted_at'];
        const sortOrder = query?.sortOrder === 'desc' ? 'DESC' : 'ASC';

        const page = query?.page ?? 1;
        const limit = query?.limit ?? 20;
        const offset = (page - 1) * limit;

        const countResult = await this.pool.query(
            `SELECT COUNT(*) FROM asset_requests r ${whereClause}`,
            values
        );
        const total = parseInt(countResult.rows[0].count, 10);

        values.push(limit, offset);
        const result = await this.pool.query(
            `SELECT 
                r.*,
                u.full_name AS requester_name,
                u.email AS requester_email,
                d.name AS department_name,
                c.name AS category_name,
                m.name AS model_name,
                a.asset_tag AS current_asset_tag,
                a.name AS current_asset_name,
                r.total_approval_steps AS approved_steps,
                NULL AS pending_approver_name,
                NULL AS pending_approver_role,
                (SELECT COUNT(*) FROM request_comments WHERE request_id = r.id) AS comment_count,
                (SELECT COUNT(*) FROM request_attachments WHERE request_id = r.id) AS attachment_count,
                EXTRACT(DAY FROM NOW() - r.submitted_at) AS days_waiting
            FROM asset_requests r
            LEFT JOIN users u ON r.requester_id = u.id
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN asset_categories c ON r.asset_category_id = c.id
            LEFT JOIN asset_models m ON r.asset_model_id = m.id
            LEFT JOIN assets a ON r.current_asset_id = a.id
            ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            values
        );

        return {
            data: result.rows.map(mapRowToRequestWithDetails),
            total
        };
    }

    async hasPendingSimilarRequest(
        requesterId: string,
        assetCategoryId: string,
        requestType: string
    ): Promise<boolean> {
        const result = await this.pool.query(
            `SELECT EXISTS(
                SELECT 1 FROM asset_requests
                WHERE requester_id = $1
                  AND asset_category_id = $2
                  AND request_type = $3
                  AND status IN ('draft', 'pending_approval', 'need_info', 'approved')
            ) AS exists`,
            [requesterId, assetCategoryId, requestType]
        );
        return result.rows[0].exists;
    }

    // ==================== Approval Steps ====================

    async createApprovalStep(
        requestId: string,
        stepOrder: number,
        approverId: string,
        approverRole?: string,
        client?: PoolClient
    ): Promise<ApprovalStep> {
        const executor = client ?? this.pool;

        const result = await executor.query(
            `INSERT INTO approval_steps (request_id, step_order, approver_id, approver_role)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [requestId, stepOrder, approverId, approverRole ?? null]
        );

        return mapRowToApprovalStep(result.rows[0]);
    }

    async createApprovalSteps(
        requestId: string,
        steps: ApprovalChainStep[],
        client?: PoolClient
    ): Promise<ApprovalStep[]> {
        const executor = client ?? this.pool;
        const createdSteps: ApprovalStep[] = [];

        for (const step of steps) {
            if (step.approverId) {
                const result = await executor.query(
                    `INSERT INTO approval_steps (request_id, step_order, approver_id, approver_role)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *`,
                    [requestId, step.order, step.approverId, step.role]
                );
                createdSteps.push(mapRowToApprovalStep(result.rows[0]));
            }
        }

        return createdSteps;
    }

    async findApprovalStepsByRequestId(requestId: string): Promise<ApprovalStep[]> {
        const result = await this.pool.query(
            `SELECT * FROM approval_steps WHERE request_id = $1 ORDER BY step_order`,
            [requestId]
        );
        return result.rows.map(mapRowToApprovalStep);
    }

    async findApprovalStepsWithDetailsByRequestId(
        requestId: string
    ): Promise<ApprovalStepWithDetails[]> {
        const result = await this.pool.query(
            `SELECT 
                s.*,
                u.full_name AS approver_name,
                u.email AS approver_email,
                eu.full_name AS escalated_from_name,
                r.request_code,
                ru.full_name AS requester_name
            FROM approval_steps s
            LEFT JOIN users u ON s.approver_id = u.id
            LEFT JOIN users eu ON s.escalated_from = eu.id
            LEFT JOIN asset_requests r ON s.request_id = r.id
            LEFT JOIN users ru ON r.requester_id = ru.id
            WHERE s.request_id = $1
            ORDER BY s.step_order`,
            [requestId]
        );
        return result.rows.map(mapRowToApprovalStepWithDetails);
    }

    async findCurrentApprovalStep(requestId: string): Promise<ApprovalStep | null> {
        const result = await this.pool.query(
            `SELECT s.* FROM approval_steps s
            JOIN asset_requests r ON s.request_id = r.id
            WHERE s.request_id = $1 AND s.step_order = r.current_approval_step`,
            [requestId]
        );
        return result.rows[0] ? mapRowToApprovalStep(result.rows[0]) : null;
    }

    async findApprovalStepById(stepId: string): Promise<ApprovalStep | null> {
        const result = await this.pool.query(
            `SELECT * FROM approval_steps WHERE id = $1`,
            [stepId]
        );
        return result.rows[0] ? mapRowToApprovalStep(result.rows[0]) : null;
    }

    async updateApprovalStep(
        stepId: string,
        status: ApprovalStatus,
        comments?: string | null,
        client?: PoolClient
    ): Promise<ApprovalStep | null> {
        const executor = client ?? this.pool;

        const result = await executor.query(
            `UPDATE approval_steps 
            SET status = $1, comments = $2, decision_date = NOW()
            WHERE id = $3
            RETURNING *`,
            [status, comments ?? null, stepId]
        );

        return result.rows[0] ? mapRowToApprovalStep(result.rows[0]) : null;
    }

    async escalateApprovalStep(
        stepId: string,
        newApproverId: string,
        reason: string,
        client?: PoolClient
    ): Promise<ApprovalStep | null> {
        const executor = client ?? this.pool;

        const result = await executor.query(
            `UPDATE approval_steps 
            SET 
                escalated_from = approver_id,
                approver_id = $1,
                escalation_reason = $2,
                escalated_at = NOW(),
                is_escalated = true
            WHERE id = $3
            RETURNING *`,
            [newApproverId, reason, stepId]
        );

        return result.rows[0] ? mapRowToApprovalStep(result.rows[0]) : null;
    }

    async updateReminderSent(
        stepId: string,
        client?: PoolClient
    ): Promise<void> {
        const executor = client ?? this.pool;

        await executor.query(
            `UPDATE approval_steps 
            SET reminder_sent_count = reminder_sent_count + 1,
                last_reminder_sent_at = NOW()
            WHERE id = $1`,
            [stepId]
        );
    }

    // ==================== Attachments ====================

    async createAttachment(
        dto: AddAttachmentDto,
        client?: PoolClient
    ): Promise<RequestAttachment> {
        const executor = client ?? this.pool;

        const result = await executor.query(
            `INSERT INTO request_attachments 
                (request_id, file_name, file_path, file_size, file_type, uploaded_by, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                dto.requestId,
                dto.fileName,
                dto.filePath,
                dto.fileSize ?? null,
                dto.fileType ?? null,
                dto.uploadedBy,
                dto.description ?? null
            ]
        );

        return mapRowToAttachment(result.rows[0]);
    }

    async findAttachmentsByRequestId(requestId: string): Promise<RequestAttachmentWithDetails[]> {
        const result = await this.pool.query(
            `SELECT 
                a.*,
                u.full_name AS uploaded_by_name
            FROM request_attachments a
            LEFT JOIN users u ON a.uploaded_by = u.id
            WHERE a.request_id = $1
            ORDER BY a.uploaded_at DESC`,
            [requestId]
        );
        return result.rows.map(mapRowToAttachmentWithDetails);
    }

    async findAttachmentById(attachmentId: string): Promise<RequestAttachment | null> {
        const result = await this.pool.query(
            `SELECT * FROM request_attachments WHERE id = $1`,
            [attachmentId]
        );
        return result.rows[0] ? mapRowToAttachment(result.rows[0]) : null;
    }

    async deleteAttachment(attachmentId: string, client?: PoolClient): Promise<boolean> {
        const executor = client ?? this.pool;
        const result = await executor.query(
            `DELETE FROM request_attachments WHERE id = $1`,
            [attachmentId]
        );
        return result.rowCount !== null && result.rowCount > 0;
    }

    // ==================== Comments ====================

    async createComment(
        dto: AddCommentDto,
        client?: PoolClient
    ): Promise<RequestComment> {
        const executor = client ?? this.pool;

        const result = await executor.query(
            `INSERT INTO request_comments 
                (request_id, content, author_id, comment_type, approval_step_id, parent_comment_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                dto.requestId,
                dto.content,
                dto.authorId,
                dto.commentType ?? 'comment',
                dto.approvalStepId ?? null,
                dto.parentCommentId ?? null
            ]
        );

        return mapRowToComment(result.rows[0]);
    }

    async findCommentsByRequestId(requestId: string): Promise<RequestCommentWithDetails[]> {
        const result = await this.pool.query(
            `SELECT 
                c.*,
                u.full_name AS author_name,
                u.email AS author_email,
                pc.content AS parent_content
            FROM request_comments c
            LEFT JOIN users u ON c.author_id = u.id
            LEFT JOIN request_comments pc ON c.parent_comment_id = pc.id
            WHERE c.request_id = $1
            ORDER BY c.created_at ASC`,
            [requestId]
        );
        return result.rows.map(mapRowToCommentWithDetails);
    }

    async findCommentById(commentId: string): Promise<RequestComment | null> {
        const result = await this.pool.query(
            `SELECT * FROM request_comments WHERE id = $1`,
            [commentId]
        );
        return result.rows[0] ? mapRowToComment(result.rows[0]) : null;
    }

    async findPendingInfoRequests(requestId: string): Promise<RequestComment[]> {
        const result = await this.pool.query(
            `SELECT c.* FROM request_comments c
            WHERE c.request_id = $1 
              AND c.comment_type = 'info_request'
              AND NOT EXISTS (
                  SELECT 1 FROM request_comments rc 
                  WHERE rc.parent_comment_id = c.id AND rc.comment_type = 'info_response'
              )
            ORDER BY c.created_at ASC`,
            [requestId]
        );
        return result.rows.map(mapRowToComment);
    }

    // ==================== Audit Logs ====================

    async createAuditLog(
        requestId: string,
        eventType: string,
        actorId: string,
        oldStatus?: RequestStatus | null,
        newStatus?: RequestStatus | null,
        metadata?: Record<string, unknown>,
        client?: PoolClient
    ): Promise<RequestAuditLog> {
        const executor = client ?? this.pool;

        const result = await executor.query(
            `INSERT INTO request_audit_logs 
                (request_id, event_type, actor_id, old_status, new_status, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                requestId,
                eventType,
                actorId,
                oldStatus ?? null,
                newStatus ?? null,
                metadata ? JSON.stringify(metadata) : null
            ]
        );

        return mapRowToAuditLog(result.rows[0]);
    }

    async findAuditLogsByRequestId(requestId: string): Promise<RequestAuditLogWithDetails[]> {
        const result = await this.pool.query(
            `SELECT 
                l.*,
                u.full_name AS actor_name,
                r.request_code
            FROM request_audit_logs l
            LEFT JOIN users u ON l.actor_id = u.id
            LEFT JOIN asset_requests r ON l.request_id = r.id
            WHERE l.request_id = $1
            ORDER BY l.created_at DESC`,
            [requestId]
        );
        return result.rows.map(mapRowToAuditLogWithDetails);
    }

    // ==================== Approval Chain Templates ====================

    async createTemplate(
        dto: {
            name: string;
            description?: string | null;
            assetCategoryId?: string | null;
            minValue?: number | null;
            maxValue?: number | null;
            departmentId?: string | null;
            requestType?: string | null;
            priority?: number;
            steps: ApprovalChainStep[];
            organizationId?: string | null;
            createdBy: string;
        },
        client?: PoolClient
    ): Promise<ApprovalChainTemplate> {
        const executor = client ?? this.pool;

        const result = await executor.query(
            `INSERT INTO approval_chain_templates 
                (name, description, asset_category_id, min_value, max_value, 
                 department_id, request_type, priority, steps, organization_id, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                dto.name,
                dto.description ?? null,
                dto.assetCategoryId ?? null,
                dto.minValue ?? null,
                dto.maxValue ?? null,
                dto.departmentId ?? null,
                dto.requestType ?? null,
                dto.priority ?? 0,
                JSON.stringify(dto.steps),
                dto.organizationId ?? null,
                dto.createdBy
            ]
        );

        return mapRowToTemplate(result.rows[0]);
    }

    async findTemplateById(templateId: string): Promise<ApprovalChainTemplate | null> {
        const result = await this.pool.query(
            `SELECT * FROM approval_chain_templates WHERE id = $1`,
            [templateId]
        );
        return result.rows[0] ? mapRowToTemplate(result.rows[0]) : null;
    }

    async findActiveTemplates(organizationId?: string): Promise<ApprovalChainTemplate[]> {
        const result = await this.pool.query(
            `SELECT * FROM approval_chain_templates 
            WHERE is_active = true 
              AND ($1::uuid IS NULL OR organization_id = $1)
            ORDER BY priority DESC`,
            [organizationId ?? null]
        );
        return result.rows.map(mapRowToTemplate);
    }

    async findMatchingTemplate(
        assetCategoryId?: string | null,
        assetValue?: number | null,
        departmentId?: string | null,
        requestType?: string | null,
        organizationId?: string | null
    ): Promise<ApprovalChainTemplate | null> {
        // Find the most specific matching template (highest priority first)
        const result = await this.pool.query(
            `SELECT * FROM approval_chain_templates 
            WHERE is_active = true
              AND ($1::uuid IS NULL OR organization_id = $1 OR organization_id IS NULL)
              AND ($2::uuid IS NULL OR asset_category_id IS NULL OR asset_category_id = $2)
              AND ($3::numeric IS NULL OR min_value IS NULL OR $3 >= min_value)
              AND ($3::numeric IS NULL OR max_value IS NULL OR $3 <= max_value)
              AND ($4::uuid IS NULL OR department_id IS NULL OR department_id = $4)
              AND ($5::varchar IS NULL OR request_type IS NULL OR request_type = $5)
            ORDER BY priority DESC
            LIMIT 1`,
            [organizationId, assetCategoryId, assetValue, departmentId, requestType]
        );

        return result.rows[0] ? mapRowToTemplate(result.rows[0]) : null;
    }

    async updateTemplate(
        templateId: string,
        dto: {
            name?: string;
            description?: string | null;
            assetCategoryId?: string | null;
            minValue?: number | null;
            maxValue?: number | null;
            departmentId?: string | null;
            requestType?: string | null;
            priority?: number;
            steps?: ApprovalChainStep[];
            isActive?: boolean;
        },
        client?: PoolClient
    ): Promise<ApprovalChainTemplate | null> {
        const executor = client ?? this.pool;

        const fields: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (dto.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(dto.name);
        }
        if (dto.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(dto.description);
        }
        if (dto.assetCategoryId !== undefined) {
            fields.push(`asset_category_id = $${paramIndex++}`);
            values.push(dto.assetCategoryId);
        }
        if (dto.minValue !== undefined) {
            fields.push(`min_value = $${paramIndex++}`);
            values.push(dto.minValue);
        }
        if (dto.maxValue !== undefined) {
            fields.push(`max_value = $${paramIndex++}`);
            values.push(dto.maxValue);
        }
        if (dto.departmentId !== undefined) {
            fields.push(`department_id = $${paramIndex++}`);
            values.push(dto.departmentId);
        }
        if (dto.requestType !== undefined) {
            fields.push(`request_type = $${paramIndex++}`);
            values.push(dto.requestType);
        }
        if (dto.priority !== undefined) {
            fields.push(`priority = $${paramIndex++}`);
            values.push(dto.priority);
        }
        if (dto.steps !== undefined) {
            fields.push(`steps = $${paramIndex++}`);
            values.push(JSON.stringify(dto.steps));
        }
        if (dto.isActive !== undefined) {
            fields.push(`is_active = $${paramIndex++}`);
            values.push(dto.isActive);
        }

        if (fields.length === 0) {
            return this.findTemplateById(templateId);
        }

        values.push(templateId);
        const result = await executor.query(
            `UPDATE approval_chain_templates 
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *`,
            values
        );

        return result.rows[0] ? mapRowToTemplate(result.rows[0]) : null;
    }

    async deleteTemplate(templateId: string, client?: PoolClient): Promise<boolean> {
        const executor = client ?? this.pool;
        const result = await executor.query(
            `DELETE FROM approval_chain_templates WHERE id = $1`,
            [templateId]
        );
        return result.rowCount !== null && result.rowCount > 0;
    }

    // ==================== Statistics ====================

    async getStatistics(organizationId?: string): Promise<RequestStatistics> {
        const result = await this.pool.query(
            `SELECT 
                COUNT(*) AS total_requests,
                COUNT(*) FILTER (WHERE status = 'draft') AS draft,
                COUNT(*) FILTER (WHERE status = 'pending_approval') AS pending_approval,
                COUNT(*) FILTER (WHERE status = 'need_info') AS need_info,
                COUNT(*) FILTER (WHERE status = 'approved') AS approved,
                COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
                COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
                COUNT(*) FILTER (WHERE status = 'fulfilling') AS fulfilling,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                COUNT(*) FILTER (WHERE priority = 'low') AS priority_low,
                COUNT(*) FILTER (WHERE priority = 'normal') AS priority_normal,
                COUNT(*) FILTER (WHERE priority = 'high') AS priority_high,
                COUNT(*) FILTER (WHERE priority = 'urgent') AS priority_urgent,
                COUNT(*) FILTER (WHERE request_type = 'new') AS type_new,
                COUNT(*) FILTER (WHERE request_type = 'replacement') AS type_replacement,
                COUNT(*) FILTER (WHERE request_type = 'upgrade') AS type_upgrade,
                COUNT(*) FILTER (WHERE request_type = 'return') AS type_return,
                AVG(CASE WHEN status = 'completed' THEN 
                    EXTRACT(EPOCH FROM (fulfilled_at - submitted_at)) / 86400 
                END) AS avg_completion_days
            FROM asset_requests
            WHERE $1::uuid IS NULL OR organization_id = $1`,
            [organizationId ?? null]
        );

        const row = result.rows[0];

        // Count overdue approvals
        const overdueResult = await this.pool.query(
            `SELECT COUNT(*) FROM approval_steps s
            JOIN asset_requests r ON s.request_id = r.id
            WHERE r.status = 'pending_approval'
              AND s.step_order = r.current_approval_step
              AND s.status = 'pending'
              AND s.created_at < NOW() - INTERVAL '2 days'
              AND ($1::uuid IS NULL OR r.organization_id = $1)`,
            [organizationId ?? null]
        );

        return {
            totalRequests: parseInt(row.total_requests, 10),
            byStatus: {
                draft: parseInt(row.draft, 10),
                pending_approval: parseInt(row.pending_approval, 10),
                need_info: parseInt(row.need_info, 10),
                approved: parseInt(row.approved, 10),
                rejected: parseInt(row.rejected, 10),
                cancelled: parseInt(row.cancelled, 10),
                fulfilling: parseInt(row.fulfilling, 10),
                completed: parseInt(row.completed, 10)
            },
            byPriority: {
                low: parseInt(row.priority_low, 10),
                normal: parseInt(row.priority_normal, 10),
                high: parseInt(row.priority_high, 10),
                urgent: parseInt(row.priority_urgent, 10)
            },
            byType: {
                new: parseInt(row.type_new, 10),
                replacement: parseInt(row.type_replacement, 10),
                upgrade: parseInt(row.type_upgrade, 10),
                return: parseInt(row.type_return, 10)
            },
            avgCompletionDays: row.avg_completion_days ? parseFloat(row.avg_completion_days) : null,
            pendingApprovals: parseInt(row.pending_approval, 10),
            overdueApprovals: parseInt(overdueResult.rows[0].count, 10)
        };
    }

    // ==================== Transaction Helper ====================

    async withTransaction<T>(
        callback: (client: PoolClient) => Promise<T>
    ): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
