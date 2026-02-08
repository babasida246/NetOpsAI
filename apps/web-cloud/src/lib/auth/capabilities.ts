export type Capabilities = {
  role: string;
  isAdmin: boolean;
  canViewAi: boolean;
  canViewAssets: boolean;
  canManageAssets: boolean;
  canViewRequests: boolean;
  canCreateRequests: boolean;
  canApproveRequests: boolean;
  canViewNetOps: boolean;
  canUseTools: boolean;
  canUseFieldKit: boolean;
};

export function normalizeRole(role: string | null | undefined): string {
  const value = (role ?? '').trim();
  return value.length > 0 ? value : 'viewer';
}

export function getCapabilities(roleInput: string | null | undefined): Capabilities {
  const role = normalizeRole(roleInput);
  const isAdmin = role === 'admin' || role === 'super_admin';

  const isAssetManager = role === 'it_asset_manager' || isAdmin;
  const isNetOps =
    role === 'netops_operator' ||
    role === 'netops_admin' ||
    role === 'netops' ||
    role.startsWith('netops_') ||
    isAdmin;

  const isFieldTech = role === 'field_tech' || role === 'field' || role.startsWith('field_');

  return {
    role,
    isAdmin,
    canViewAi: isAdmin,
    canViewAssets: isAssetManager || role === 'viewer' || role === 'user' || isFieldTech,
    canManageAssets: isAssetManager,
    canViewRequests: true,
    canCreateRequests: isAssetManager,
    canApproveRequests: isAssetManager,
    canViewNetOps: isNetOps,
    canUseTools: isNetOps,
    canUseFieldKit: isNetOps || isFieldTech
  };
}

export function defaultLandingPath(caps: Capabilities): string {
  if (caps.isAdmin) return '/admin';
  if (caps.canViewNetOps) return '/netops/devices';
  if (caps.canManageAssets) return '/assets';
  if (caps.canViewAssets) return '/me/assets';
  return '/chat';
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isRouteAllowed(pathname: string, caps: Capabilities): boolean {
  // Always-allowed routes (authenticated area).
  if (pathname === '/' || pathname.startsWith('/chat') || pathname.startsWith('/profile') || pathname.startsWith('/help')) {
    return true;
  }
  if (pathname.startsWith('/forbidden') || pathname.startsWith('/logout')) {
    return true;
  }
  if (pathname.startsWith('/me/')) {
    return true;
  }
  if (pathname.startsWith('/notifications')) {
    return caps.canViewRequests || caps.canViewAssets;
  }
  if (pathname.startsWith('/inbox')) {
    return caps.canApproveRequests;
  }

  // Admin-only
  if (pathname.startsWith('/admin')) {
    return caps.isAdmin;
  }

  // AI Console pages
  if (pathname.startsWith('/stats') || pathname.startsWith('/models')) {
    return caps.canViewAi;
  }

  // NetOps
  if (pathname.startsWith('/netops/field')) {
    return caps.canUseFieldKit;
  }
  if (pathname.startsWith('/netops')) {
    return caps.canViewNetOps;
  }

  // Tools (legacy alias)
  if (pathname.startsWith('/tools')) {
    return caps.canUseTools;
  }

  // Asset management surface
  if (pathname.startsWith('/assets')) {
    const parts = pathname.split('/').filter(Boolean);
    const maybeId = parts[1] ?? '';
    // Allow asset detail read-only for anyone who can view assets (backward compatible).
    if (parts.length === 2 && isUuidLike(maybeId)) {
      return caps.canViewAssets;
    }
    return caps.canManageAssets;
  }

  if (pathname.startsWith('/requests')) {
    const parts = pathname.split('/').filter(Boolean);
    const maybeId = parts[1] ?? '';
    if (pathname === '/requests/new') {
      return caps.canCreateRequests;
    }
    if (parts.length === 2 && maybeId && maybeId !== 'new') {
      return caps.canViewRequests;
    }
    return caps.canManageAssets;
  }

  // Other asset-related modules (guarded for managers)
  if (
    pathname.startsWith('/inventory') ||
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/warehouse') ||
    pathname.startsWith('/cmdb') ||
    pathname.startsWith('/reports')
  ) {
    return caps.canManageAssets;
  }

  // Default: allow (don’t accidentally lock out unknown routes).
  return true;
}
