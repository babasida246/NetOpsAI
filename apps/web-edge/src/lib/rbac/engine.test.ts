import { describe, expect, it } from 'vitest';
import { seedRbacData } from '$lib/mocks/rbac';
import { explainEffectiveScope, indexRbacData, resolveRolePermission } from '$lib/rbac/engine';

describe('rbac engine', () => {
  it('resolves inherited permissions via baseRoleId chain', () => {
    const index = indexRbacData(seedRbacData.roles, seedRbacData.overrides);
    const result = resolveRolePermission('operator', 'users.read', index).record;

    expect(result.scope).toBe('group');
    expect(result.source).toBe('inherited');
    expect(result.isExplicit).toBe(false);
    expect(result.inheritedFromRoleId).toBe('operator_base');
  });

  it('resolves explicit overrides on the role', () => {
    const index = indexRbacData(seedRbacData.roles, seedRbacData.overrides);
    const result = resolveRolePermission('operator', 'tools.execute.network-change', index).record;

    expect(result.scope).toBe('group');
    expect(result.source).toBe('explicit');
    expect(result.isExplicit).toBe(true);
  });

  it('explains effective scope using group role when context.groupId matches membership', () => {
    const user = seedRbacData.users.find((u) => u.id === 'user_b');
    expect(user).toBeTruthy();

    const index = indexRbacData(seedRbacData.roles, seedRbacData.overrides);
    const result = explainEffectiveScope({
      user: user!,
      permKey: 'assets.update',
      context: { groupId: 'group_network' },
      index
    });

    expect(result.effectiveScope).toBe('group');
    expect(['groupRole', 'inherited', 'default', 'globalRole']).toContain(result.source.sourceType);
    expect(result.steps.join('\n')).toContain('Context groupId=group_network');
  });

  it('falls back to global role when no group role matches', () => {
    const user = seedRbacData.users.find((u) => u.id === 'user_a');
    expect(user).toBeTruthy();

    const index = indexRbacData(seedRbacData.roles, seedRbacData.overrides);
    const result = explainEffectiveScope({
      user: user!,
      permKey: 'tools.execute.network-change',
      context: { groupId: 'group_server' }, // no membership
      index
    });

    expect(result.steps.join('\n')).toContain('use GlobalRole=');
  });
});

