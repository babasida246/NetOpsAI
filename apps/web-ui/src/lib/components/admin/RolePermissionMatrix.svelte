<script lang="ts">
    import { Card, Button, Badge, Input, Label, Select, Alert } from 'flowbite-svelte'
    import { onMount } from 'svelte'
    import {
        adminRoles,
        adminPermissions,
        groupLabels,
        defaultRoleGrants,
        roleTemplates,
        permissionIds,
        type AdminRoleId,
        type AdminPermissionId,
        type PermissionGroup,
        type PermissionDefinition
    } from '$lib/admin/permissions'
    import {
        buildMatrix,
        computeMatrixDiff,
        getCurrentAdminRole,
        getCurrentUserId,
        isExpired,
        loadApprovals,
        loadAuditLog,
        loadOverrides,
        loadRoleMatrixState,
        loadScopedGrants,
        pushAudit,
        requestApproval,
        requiresApproval,
        saveApprovals,
        saveOverrides,
        saveRoleMatrixState,
        saveScopedGrants,
        applyApproval,
        type ApprovalRequest,
        type PermissionAuditEntry,
        type RoleMatrix,
        type ScopedGrant,
        type ScopeType,
        type UserOverride
    } from '$lib/admin/permissionState'
    import { _, isLoading } from '$lib/i18n'

    type PermissionGroupView = {
        id: PermissionGroup
        label: string
        permissions: PermissionDefinition[]
    }

    function cloneMatrix(source: RoleMatrix): RoleMatrix {
        if (typeof structuredClone === 'function') {
            return structuredClone(source)
        }
        return JSON.parse(JSON.stringify(source)) as RoleMatrix
    }

    function createId(prefix: string): string {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return `${prefix}_${crypto.randomUUID()}`
        }
        return `${prefix}_${Math.random().toString(36).slice(2)}`
    }

    const initialState = loadRoleMatrixState()
    let matrix = $state<RoleMatrix>(cloneMatrix(initialState.matrix))
    let lastSavedMatrix = $state<RoleMatrix>(cloneMatrix(initialState.lastSavedMatrix ?? initialState.matrix))
    let savedAt = $state<string | undefined>(initialState.savedAt)

    let scopedGrants = $state<ScopedGrant[]>(loadScopedGrants())
    let overrides = $state<UserOverride[]>(loadOverrides())
    let approvals = $state<ApprovalRequest[]>(loadApprovals())
    let auditLog = $state<PermissionAuditEntry[]>(loadAuditLog())

    let currentRole = $state<AdminRoleId>('user')
    let currentUserId = $state<string | null>(null)
    let notice = $state('')

    let selectedGroup = $state<PermissionGroup | 'all'>('all')
    let templateRole = $state<AdminRoleId>('admin')
    let templateId = $state<string>(roleTemplates[0]?.id ?? '')

    let scopeRole = $state<AdminRoleId>('admin')
    let scopePermission = $state<AdminPermissionId>('models.view')
    let scopeEffect = $state<'grant' | 'deny'>('grant')
    let scopeType = $state<ScopeType>('global')
    let scopeValue = $state('')
    let scopeExpiresAt = $state('')
    let scopeReason = $state('')

    let overrideUserId = $state('')
    let overridePermission = $state<AdminPermissionId>('users.view')
    let overrideEffect = $state<'grant' | 'deny'>('grant')
    let overrideExpiresAt = $state('')
    let overrideReason = $state('')

    let simulateUserId = $state('')
    let simulateRole = $state<AdminRoleId>('admin')
    let simulateScopeType = $state<ScopeType>('global')
    let simulateScopeValue = $state('')

    const groupedPermissions = $derived.by(() => {
        const map = new Map<PermissionGroup, PermissionDefinition[]>()
        for (const permission of adminPermissions) {
            const list = map.get(permission.group) ?? []
            list.push(permission)
            map.set(permission.group, list)
        }
        return Array.from(map.entries()).map(([id, permissions]) => ({
            id,
            label: groupLabels[id],
            permissions
        })) satisfies PermissionGroupView[]
    })

    const visibleGroups = $derived.by(() => {
        if (selectedGroup === 'all') return groupedPermissions
        return groupedPermissions.filter((group) => group.id === selectedGroup)
    })

    const diff = $derived.by(() => computeMatrixDiff(lastSavedMatrix, matrix))
    const pendingApprovals = $derived.by(() => approvals.filter((approval) => approval.status === 'pending'))
    const canApprove = $derived.by(() => currentRole === 'super_admin')
    const canManagePermissions = $derived.by(() => currentRole === 'super_admin' || currentRole === 'admin')

    function syncState() {
        const state = loadRoleMatrixState()
        matrix = cloneMatrix(state.matrix)
        lastSavedMatrix = cloneMatrix(state.lastSavedMatrix ?? state.matrix)
        savedAt = state.savedAt
        scopedGrants = loadScopedGrants()
        overrides = loadOverrides()
        approvals = loadApprovals()
        auditLog = loadAuditLog()
    }

    function matchesScope(grant: { scopeType?: ScopeType; scopeValue?: string }, scopeType?: ScopeType, scopeValue?: string) {
        if (!scopeType || scopeType === 'global') return true
        if (grant.scopeType !== scopeType) return false
        if (!scopeValue) return true
        return grant.scopeValue === scopeValue
    }

    function computeEffectiveSet(roleId: AdminRoleId, userId?: string) {
        const effective = new Set<AdminPermissionId>()
        for (const permissionId of permissionIds) {
            if (matrix[roleId]?.[permissionId]) {
                effective.add(permissionId)
            }
        }

        for (const grant of scopedGrants) {
            if (grant.roleId !== roleId || isExpired(grant.expiresAt)) continue
            if (!matchesScope(grant, simulateScopeType, simulateScopeValue)) continue
            if (grant.effect === 'deny') {
                effective.delete(grant.permissionId)
            } else {
                effective.add(grant.permissionId)
            }
        }

        if (userId) {
            for (const override of overrides) {
                if (override.userId !== userId || isExpired(override.expiresAt)) continue
                if (override.effect === 'deny') {
                    effective.delete(override.permissionId)
                } else {
                    effective.add(override.permissionId)
                }
            }
        }

        return effective
    }

    const effectivePermissions = $derived.by(() => {
        const roleId = simulateRole
        const userId = simulateUserId.trim() || undefined
        return computeEffectiveSet(roleId, userId)
    })

    function setNotice(message: string) {
        notice = message
        setTimeout(() => {
            if (notice === message) notice = ''
        }, 5000)
    }

    function togglePermission(roleId: AdminRoleId, permissionId: AdminPermissionId) {
        if (!canManagePermissions) {
            setNotice('You do not have permission to edit access controls.')
            return
        }
        const current = matrix[roleId]?.[permissionId] ?? false
        const desired = !current
        if (requiresApproval(permissionId) && currentRole !== 'super_admin') {
            requestApproval({
                targetType: 'role',
                roleId,
                permissionId,
                desiredEffect: desired ? 'grant' : 'deny',
                reason: 'Sensitive permission change',
                requestedBy: currentUserId ?? undefined
            })
            approvals = loadApprovals()
            auditLog = loadAuditLog()
            setNotice('Approval required for sensitive permission changes. Request added to the queue.')
            return
        }
        matrix = {
            ...matrix,
            [roleId]: {
                ...matrix[roleId],
                [permissionId]: desired
            }
        }
    }

    function applyTemplate() {
        const template = roleTemplates.find((item) => item.id === templateId)
        if (!template) return
        const next = cloneMatrix(matrix)
        for (const permissionId of permissionIds) {
            next[templateRole][permissionId] = template.grants.includes(permissionId)
        }
        matrix = next
        setNotice(`Template applied to ${templateRole}. Remember to save changes.`)
    }

    function resetToSaved() {
        matrix = cloneMatrix(lastSavedMatrix)
    }

    function resetToDefaults() {
        matrix = buildMatrix(defaultRoleGrants)
        setNotice('Defaults restored. Save to apply.')
    }

    function saveMatrix() {
        const changes = computeMatrixDiff(lastSavedMatrix, matrix)
        if (changes.length === 0) {
            setNotice('No changes to save.')
            return
        }
        const snapshot = cloneMatrix(matrix)
        const savedAtValue = new Date().toISOString()
        saveRoleMatrixState({ matrix: snapshot, lastSavedMatrix: cloneMatrix(snapshot), savedAt: savedAtValue })
        lastSavedMatrix = cloneMatrix(snapshot)
        savedAt = savedAtValue
        pushAudit({
            action: 'matrix_update',
            actorId: currentUserId ?? undefined,
            actorRole: currentRole,
            summary: `Matrix updated (${changes.length} changes)`,
            details: { changes }
        })
        auditLog = loadAuditLog()
        setNotice('Role matrix saved.')
    }

    function toIso(dateValue: string) {
        if (!dateValue) return undefined
        const date = new Date(dateValue)
        if (Number.isNaN(date.getTime())) return undefined
        return date.toISOString()
    }

    function addScopedGrant() {
        if (!scopePermission) return
        if (requiresApproval(scopePermission) && currentRole !== 'super_admin') {
            requestApproval({
                targetType: 'scope',
                roleId: scopeRole,
                permissionId: scopePermission,
                desiredEffect: scopeEffect,
                scopeType,
                scopeValue: scopeValue || undefined,
                reason: scopeReason || undefined,
                requestedBy: currentUserId ?? undefined
            })
            approvals = loadApprovals()
            auditLog = loadAuditLog()
            setNotice('Scope change queued for approval.')
            return
        }
        const next: ScopedGrant = {
            id: createId('scope'),
            roleId: scopeRole,
            permissionId: scopePermission,
            scopeType,
            scopeValue: scopeValue || undefined,
            effect: scopeEffect,
            reason: scopeReason || undefined,
            expiresAt: toIso(scopeExpiresAt),
            createdAt: new Date().toISOString(),
            requestedBy: currentUserId ?? undefined
        }
        scopedGrants = [next, ...scopedGrants]
        saveScopedGrants(scopedGrants)
        pushAudit({
            action: 'scope_update',
            actorId: currentUserId ?? undefined,
            actorRole: currentRole,
            summary: `Scope ${scopeEffect} for ${scopePermission}`,
            details: next
        })
        auditLog = loadAuditLog()
        scopeValue = ''
        scopeReason = ''
        scopeExpiresAt = ''
        setNotice('Scoped grant saved.')
    }

    function removeScopedGrant(grant: ScopedGrant) {
        scopedGrants = scopedGrants.filter((item) => item.id !== grant.id)
        saveScopedGrants(scopedGrants)
        pushAudit({
            action: 'scope_update',
            actorId: currentUserId ?? undefined,
            actorRole: currentRole,
            summary: `Scope removed for ${grant.permissionId}`,
            details: grant
        })
        auditLog = loadAuditLog()
    }

    function addOverride() {
        const userId = overrideUserId.trim()
        if (!userId) {
            setNotice('Provide a user id or email for the override.')
            return
        }
        if (requiresApproval(overridePermission) && currentRole !== 'super_admin') {
            requestApproval({
                targetType: 'user',
                userId,
                permissionId: overridePermission,
                desiredEffect: overrideEffect,
                reason: overrideReason || undefined,
                requestedBy: currentUserId ?? undefined
            })
            approvals = loadApprovals()
            auditLog = loadAuditLog()
            setNotice('User override queued for approval.')
            return
        }
        const next: UserOverride = {
            id: createId('override'),
            userId,
            permissionId: overridePermission,
            effect: overrideEffect,
            reason: overrideReason || undefined,
            expiresAt: toIso(overrideExpiresAt),
            createdAt: new Date().toISOString(),
            requestedBy: currentUserId ?? undefined
        }
        overrides = [next, ...overrides]
        saveOverrides(overrides)
        pushAudit({
            action: 'override_update',
            actorId: currentUserId ?? undefined,
            actorRole: currentRole,
            summary: `User override ${overrideEffect} for ${overridePermission}`,
            details: next
        })
        auditLog = loadAuditLog()
        overrideUserId = ''
        overrideReason = ''
        overrideExpiresAt = ''
        setNotice('User override saved.')
    }

    function removeOverride(override: UserOverride) {
        overrides = overrides.filter((item) => item.id !== override.id)
        saveOverrides(overrides)
        pushAudit({
            action: 'override_update',
            actorId: currentUserId ?? undefined,
            actorRole: currentRole,
            summary: `User override removed for ${override.permissionId}`,
            details: override
        })
        auditLog = loadAuditLog()
    }

    function handleApprovalDecision(approval: ApprovalRequest, decision: 'approved' | 'rejected') {
        applyApproval(
            approval,
            { id: currentUserId ?? undefined, role: currentRole },
            decision
        )
        approvals = loadApprovals()
        saveApprovals(approvals)
        syncState()
        setNotice(`Approval ${decision}.`)
    }

    function formatScope(grant: ScopedGrant) {
        if (grant.scopeType === 'global') return 'Global'
        return `${grant.scopeType}${grant.scopeValue ? `:${grant.scopeValue}` : ''}`
    }

    onMount(() => {
        currentRole = getCurrentAdminRole()
        currentUserId = getCurrentUserId()
        syncState()
    })
</script>

<div class="space-y-4">
    <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
        <div class="flex items-start justify-between gap-4 flex-wrap">
            <div>
                <h3 class="text-lg font-semibold text-slate-900 dark:text-white">{$_('admin.roleMatrix.title')}</h3>
                <p class="text-sm text-slate-500">{$_('admin.roleMatrix.subtitle')}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                {#if diff.length > 0}
                    <Badge color="yellow">{$_('admin.roleMatrix.unsaved', { values: { count: diff.length } })}</Badge>
                {/if}
                {#if pendingApprovals.length > 0}
                    <Badge color="red">{$_('admin.roleMatrix.pendingApprovalsBadge', { values: { count: pendingApprovals.length } })}</Badge>
                {/if}
                <Button size="sm" onclick={saveMatrix} disabled={diff.length === 0}>{$_('common.save')}</Button>
                <Button size="sm" color="light" onclick={resetToSaved}>{$_('common.reset')}</Button>
                <Button size="sm" color="light" onclick={resetToDefaults}>{$_('admin.roleMatrix.defaults')}</Button>
            </div>
        </div>

        {#if notice}
            <Alert color="blue" class="mt-3">{notice}</Alert>
        {/if}

        <div class="mt-4 grid gap-4 xl:grid-cols-[2fr,1fr]">
            <div class="space-y-3">
                <div class="flex flex-wrap items-center gap-3">
                    <div class="min-w-[180px]">
                        <Label>{$_('admin.roleMatrix.filterGroup')}</Label>
                        <Select bind:value={selectedGroup}>
                            <option value="all">{$_('admin.roleMatrix.allGroups')}</option>
                            {#each groupedPermissions as group}
                                <option value={group.id}>{group.label}</option>
                            {/each}
                        </Select>
                    </div>
                    <div class="min-w-[180px]">
                        <Label>{$_('admin.roleMatrix.templateRole')}</Label>
                        <Select bind:value={templateRole}>
                            {#each adminRoles as role}
                                <option value={role.id}>{role.label}</option>
                            {/each}
                        </Select>
                    </div>
                    <div class="min-w-[220px]">
                        <Label>{$_('admin.roleMatrix.applyTemplate')}</Label>
                        <div class="flex gap-2">
                            <Select bind:value={templateId}>
                                {#each roleTemplates as template}
                                    <option value={template.id}>{template.label}</option>
                                {/each}
                            </Select>
                            <Button size="sm" color="light" onclick={applyTemplate}>{$_('admin.roleMatrix.apply')}</Button>
                        </div>
                    </div>
                </div>

                {#each visibleGroups as group}
                    <div class="rounded-lg border border-slate-200 dark:border-slate-800">
                        <div class="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/40">
                            <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">{group.label}</div>
                            <Badge color="dark">{group.permissions.length}</Badge>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full text-sm">
                                <thead class="text-xs uppercase text-slate-400">
                                    <tr>
                                        <th class="text-left px-3 py-2">{$_('admin.roleMatrix.permission')}</th>
                                        {#each adminRoles as role}
                                            <th class="px-3 py-2 text-center">{role.label}</th>
                                        {/each}
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each group.permissions as permission}
                                        <tr class="border-t border-slate-200 dark:border-slate-800">
                                            <td class="px-3 py-2">
                                                <div class="font-medium text-slate-900 dark:text-white">{permission.label}</div>
                                                <div class="text-xs text-slate-500">{permission.description}</div>
                                                {#if permission.sensitive}
                                                    <Badge color="red" class="mt-1 text-[10px]">{$_('admin.roleMatrix.sensitive')}</Badge>
                                                {/if}
                                            </td>
                                            {#each adminRoles as role}
                                                <td class="px-3 py-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        class="rounded border-slate-300"
                                                        checked={matrix[role.id]?.[permission.id]}
                                                        onchange={() => togglePermission(role.id, permission.id)}
                                                        disabled={!canManagePermissions && currentRole !== 'super_admin'}
                                                    />
                                                </td>
                                            {/each}
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    </div>
                {/each}
            </div>

            <div class="space-y-3">
                <div class="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                    <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('admin.roleMatrix.changeSummary')}</div>
                    <div class="text-xs text-slate-500">{$_('admin.roleMatrix.pendingChangesHint', { values: { count: diff.length } })} {savedAt ? new Date(savedAt).toLocaleString() : $_('common.never')}</div>
                    <div class="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {#if diff.length === 0}
                            <p class="text-xs text-slate-500">{$_('admin.roleMatrix.noPendingChanges')}</p>
                        {:else}
                            {#each diff as change}
                                <div class="text-xs text-slate-600">
                                    <span class="font-semibold">{change.roleId}</span> · {change.permissionId} → {change.to ? 'Grant' : 'Deny'}
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>
                <div class="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                    <div class="text-sm font-semibold text-slate-900 dark:text-white">{$_('admin.roleMatrix.pendingApprovalsTitle')}</div>
                    <div class="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {#if pendingApprovals.length === 0}
                            <p class="text-xs text-slate-500">{$_('admin.roleMatrix.noApprovalRequests')}</p>
                        {:else}
                            {#each pendingApprovals as approval}
                                <div class="rounded border border-slate-200 dark:border-slate-700 p-2 text-xs">
                                    <div class="font-semibold">{approval.permissionId}</div>
                                    <div class="text-slate-500">{approval.targetType} · {approval.desiredEffect}</div>
                                    {#if approval.reason}
                                        <div class="text-slate-400">{$_('common.reason')}: {approval.reason}</div>
                                    {/if}
                                    <div class="text-slate-400">{$_('admin.roleMatrix.requestedLabel')} {new Date(approval.requestedAt).toLocaleString()}</div>
                                    {#if canApprove}
                                        <div class="mt-2 flex gap-2">
                                            <Button size="xs" onclick={() => handleApprovalDecision(approval, 'approved')}>{$_('admin.roleMatrix.approve')}</Button>
                                            <Button size="xs" color="light" onclick={() => handleApprovalDecision(approval, 'rejected')}>{$_('admin.roleMatrix.reject')}</Button>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </Card>

    <div class="grid gap-4 lg:grid-cols-2">
        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h3 class="text-base font-semibold text-slate-900 dark:text-white">{$_('admin.roleMatrix.scopedGrants')}</h3>
                    <p class="text-xs text-slate-500">{$_('admin.roleMatrix.scopedGrantsDesc')}</p>
                </div>
                <Badge color="blue">{scopedGrants.length}</Badge>
            </div>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                    <Label>{$_('common.role')}</Label>
                    <Select bind:value={scopeRole}>
                        {#each adminRoles as role}
                            <option value={role.id}>{role.label}</option>
                        {/each}
                    </Select>
                </div>
                <div>
                    <Label>{$_('common.permission')}</Label>
                    <Select bind:value={scopePermission}>
                        {#each adminPermissions as permission}
                            <option value={permission.id}>{permission.label}</option>
                        {/each}
                    </Select>
                </div>
                <div>
                    <Label>{$_('common.effect')}</Label>
                    <Select bind:value={scopeEffect}>
                        <option value="grant">{$_('common.grant')}</option>
                        <option value="deny">{$_('common.deny')}</option>
                    </Select>
                </div>
                <div>
                    <Label>{$_('admin.roleMatrix.scopeType')}</Label>
                    <Select bind:value={scopeType}>
                        <option value="global">{$_('admin.roleMatrix.scopeGlobal')}</option>
                        <option value="org">{$_('admin.roleMatrix.scopeOrg')}</option>
                        <option value="asset_group">{$_('admin.roleMatrix.scopeAssetGroup')}</option>
                        <option value="model">{$_('admin.roleMatrix.scopeModel')}</option>
                    </Select>
                </div>
                {#if scopeType !== 'global'}
                    <div class="sm:col-span-2">
                        <Label>{$_('admin.roleMatrix.scopeValue')}</Label>
                        <Input bind:value={scopeValue} placeholder="org-123 / model-id / group" />
                    </div>
                {/if}
                <div>
                    <Label>{$_('common.expires')}</Label>
                    <Input type="datetime-local" bind:value={scopeExpiresAt} />
                </div>
                <div>
                    <Label>{$_('common.reason')}</Label>
                    <Input bind:value={scopeReason} placeholder={$_('admin.roleMatrix.changeReasonPlaceholder')} />
                </div>
            </div>
            <div class="mt-3">
                <Button size="sm" onclick={addScopedGrant}>{$_('admin.roleMatrix.addScope')}</Button>
            </div>
            <div class="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {#if scopedGrants.length === 0}
                    <p class="text-xs text-slate-500">{$_('admin.roleMatrix.noScopedGrants')}</p>
                {:else}
                    {#each scopedGrants as grant}
                        <div class="rounded border border-slate-200 dark:border-slate-700 p-2 text-xs">
                            <div class="flex items-center justify-between">
                                <div class="font-semibold">{grant.permissionId}</div>
                                <Badge color={grant.effect === 'grant' ? 'green' : 'red'}>{grant.effect}</Badge>
                            </div>
                            <div class="text-slate-500">{$_('common.role')}: {grant.roleId} · {formatScope(grant)}</div>
                            {#if grant.reason}
                                <div class="text-slate-400">{$_('common.reason')}: {grant.reason}</div>
                            {/if}
                            {#if grant.expiresAt}
                                <div class="text-slate-400">{$_('common.expires')}: {new Date(grant.expiresAt).toLocaleString()}</div>
                            {/if}
                            <div class="mt-2">
                                <Button size="xs" color="light" onclick={() => removeScopedGrant(grant)}>{$_('common.remove')}</Button>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </Card>

        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h3 class="text-base font-semibold text-slate-900 dark:text-white">{$_('admin.roleMatrix.userOverrides')}</h3>
                    <p class="text-xs text-slate-500">{$_('admin.roleMatrix.userOverridesDesc')}</p>
                </div>
                <Badge color="blue">{overrides.length}</Badge>
            </div>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <div class="sm:col-span-2">
                    <Label>{$_('admin.roleMatrix.userIdEmail')}</Label>
                    <Input bind:value={overrideUserId} placeholder={$_('admin.roleMatrix.userIdPlaceholder')} />
                </div>
                <div>
                    <Label>{$_('common.permission')}</Label>
                    <Select bind:value={overridePermission}>
                        {#each adminPermissions as permission}
                            <option value={permission.id}>{permission.label}</option>
                        {/each}
                    </Select>
                </div>
                <div>
                    <Label>{$_('common.effect')}</Label>
                    <Select bind:value={overrideEffect}>
                        <option value="grant">{$_('common.grant')}</option>
                        <option value="deny">{$_('common.deny')}</option>
                    </Select>
                </div>
                <div>
                    <Label>{$_('common.expires')}</Label>
                    <Input type="datetime-local" bind:value={overrideExpiresAt} />
                </div>
                <div>
                    <Label>{$_('common.reason')}</Label>
                    <Input bind:value={overrideReason} placeholder={$_('admin.roleMatrix.incidentPlaceholder')} />
                </div>
            </div>
            <div class="mt-3">
                <Button size="sm" onclick={addOverride}>{$_('admin.roleMatrix.addOverride')}</Button>
            </div>
            <div class="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {#if overrides.length === 0}
                    <p class="text-xs text-slate-500">{$_('admin.roleMatrix.noUserOverrides')}</p>
                {:else}
                    {#each overrides as override}
                        <div class="rounded border border-slate-200 dark:border-slate-700 p-2 text-xs">
                            <div class="flex items-center justify-between">
                                <div class="font-semibold">{override.permissionId}</div>
                                <Badge color={override.effect === 'grant' ? 'green' : 'red'}>{override.effect}</Badge>
                            </div>
                            <div class="text-slate-500">{$_('common.user')}: {override.userId}</div>
                            {#if override.reason}
                                <div class="text-slate-400">{$_('common.reason')}: {override.reason}</div>
                            {/if}
                            {#if override.expiresAt}
                                <div class="text-slate-400">{$_('common.expires')}: {new Date(override.expiresAt).toLocaleString()}</div>
                            {/if}
                            <div class="mt-2">
                                <Button size="xs" color="light" onclick={() => removeOverride(override)}>{$_('common.remove')}</Button>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </Card>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h3 class="text-base font-semibold text-slate-900 dark:text-white">{$_('admin.roleMatrix.approvalQueue')}</h3>
                    <p class="text-xs text-slate-500">{$_('admin.roleMatrix.approvalQueueDesc')}</p>
                </div>
                <Badge color="blue">{approvals.length}</Badge>
            </div>
            <div class="mt-3 space-y-2 max-h-72 overflow-y-auto">
                {#if approvals.length === 0}
                    <p class="text-xs text-slate-500">{$_('admin.roleMatrix.noApprovalsLogged')}</p>
                {:else}
                    {#each approvals as approval}
                        <div class="rounded border border-slate-200 dark:border-slate-700 p-2 text-xs">
                            <div class="flex items-center justify-between">
                                <div class="font-semibold">{approval.permissionId}</div>
                                <Badge color={approval.status === 'approved' ? 'green' : approval.status === 'rejected' ? 'red' : 'yellow'}>
                                    {approval.status}
                                </Badge>
                            </div>
                            <div class="text-slate-500">
                                {approval.targetType} · {approval.desiredEffect}
                                {#if approval.scopeType} · {approval.scopeType}{approval.scopeValue ? `:${approval.scopeValue}` : ''}{/if}
                            </div>
                            {#if approval.reason}
                                <div class="text-slate-400">{$_('common.reason')}: {approval.reason}</div>
                            {/if}
                            <div class="text-slate-400">{$_('admin.roleMatrix.requestedLabel')}: {new Date(approval.requestedAt).toLocaleString()}</div>
                            {#if approval.reviewedAt}
                                <div class="text-slate-400">{$_('admin.roleMatrix.reviewedLabel')}: {new Date(approval.reviewedAt).toLocaleString()}</div>
                            {/if}
                            {#if approval.status === 'pending' && canApprove}
                                <div class="mt-2 flex gap-2">
                                    <Button size="xs" onclick={() => handleApprovalDecision(approval, 'approved')}>{$_('admin.roleMatrix.approve')}</Button>
                                    <Button size="xs" color="light" onclick={() => handleApprovalDecision(approval, 'rejected')}>{$_('admin.roleMatrix.reject')}</Button>
                                </div>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        </Card>

        <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
            <div class="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h3 class="text-base font-semibold text-slate-900 dark:text-white">{$_('admin.roleMatrix.simulation')}</h3>
                    <p class="text-xs text-slate-500">{$_('admin.roleMatrix.simulationDesc')}</p>
                </div>
            </div>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <div class="sm:col-span-2">
                    <Label>{$_('admin.roleMatrix.userIdEmailOptional')}</Label>
                    <Input bind:value={simulateUserId} placeholder={$_('admin.roleMatrix.leaveBlankPlaceholder')} />
                </div>
                <div>
                    <Label>{$_('common.role')}</Label>
                    <Select bind:value={simulateRole}>
                        {#each adminRoles as role}
                            <option value={role.id}>{role.label}</option>
                        {/each}
                    </Select>
                </div>
                <div>
                    <Label>{$_('admin.roleMatrix.scopeType')}</Label>
                    <Select bind:value={simulateScopeType}>
                        <option value="global">{$_('admin.roleMatrix.scopeGlobal')}</option>
                        <option value="org">{$_('admin.roleMatrix.scopeOrg')}</option>
                        <option value="asset_group">{$_('admin.roleMatrix.scopeAssetGroup')}</option>
                        <option value="model">{$_('admin.roleMatrix.scopeModel')}</option>
                    </Select>
                </div>
                {#if simulateScopeType !== 'global'}
                    <div class="sm:col-span-2">
                        <Label>{$_('admin.roleMatrix.scopeValue')}</Label>
                        <Input bind:value={simulateScopeValue} />
                    </div>
                {/if}
            </div>
            <div class="mt-4 grid gap-2 sm:grid-cols-2">
                {#each adminPermissions as permission}
                    <div class="flex items-center justify-between rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs">
                        <span>{permission.label}</span>
                        {#if effectivePermissions.has(permission.id)}
                            <Badge color="green">{$_('admin.roleMatrix.granted')}</Badge>
                        {:else}
                            <Badge color="dark">{$_('admin.roleMatrix.denied')}</Badge>
                        {/if}
                    </div>
                {/each}
            </div>
        </Card>
    </div>

    <Card class="w-full max-w-none border border-slate-200 dark:border-slate-800">
        <div class="flex items-center justify-between gap-3 flex-wrap">
            <div>
                <h3 class="text-base font-semibold text-slate-900 dark:text-white">{$_('admin.roleMatrix.auditLog')}</h3>
                <p class="text-xs text-slate-500">{$_('admin.roleMatrix.auditLogDesc')}</p>
            </div>
            <Badge color="blue">{auditLog.length}</Badge>
        </div>
        <div class="mt-3 space-y-2 max-h-72 overflow-y-auto">
            {#if auditLog.length === 0}
                <p class="text-xs text-slate-500">{$_('admin.roleMatrix.noAuditEntries')}</p>
            {:else}
                {#each auditLog as entry}
                    <div class="rounded border border-slate-200 dark:border-slate-700 p-2 text-xs">
                        <div class="flex items-center justify-between">
                            <div class="font-semibold">{entry.summary}</div>
                            <Badge color="dark">{entry.action}</Badge>
                        </div>
                        <div class="text-slate-400">{new Date(entry.createdAt).toLocaleString()}</div>
                    </div>
                {/each}
            {/if}
        </div>
    </Card>
</div>
