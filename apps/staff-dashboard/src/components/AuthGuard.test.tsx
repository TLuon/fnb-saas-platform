// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { authStore } from '@fnb/utils';
import { AuthGuard } from './AuthGuard';

function renderGuard(role: 'OWNER' | 'STAFF', requiredRole: 'OWNER' | 'STAFF', path: string) {
  authStore.setState({
    accessToken: 'verified-token',
    refreshToken: null,
    profile: { id: 'user-id', role_app: role },
    role,
    tenantId: 'tenant-id',
    branchId: 'branch-id',
    isAuthenticated: true,
    isLoading: false,
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthGuard requiredRole={requiredRole}>
        <div>Protected owner content</div>
      </AuthGuard>
    </MemoryRouter>,
  );
}

describe('AuthGuard role isolation', () => {
  beforeEach(() => authStore.getState().clearAuth());
  afterEach(() => {
    cleanup();
    authStore.getState().clearAuth();
  });

  it.each(['/inventory', '/shifts'])('blocks STAFF from OWNER route %s', (path) => {
    renderGuard('STAFF', 'OWNER', path);

    expect(screen.getByText(/403 - Truy cập bị từ chối/i)).toBeTruthy();
    expect(screen.queryByText('Protected owner content')).toBeNull();
  });

  it('allows OWNER into an OWNER route', () => {
    renderGuard('OWNER', 'OWNER', '/inventory');

    expect(screen.getByText('Protected owner content')).toBeTruthy();
  });
});
