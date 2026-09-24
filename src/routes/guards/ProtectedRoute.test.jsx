import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute.jsx';

const useAuthMock = vi.fn();
vi.mock('@/hooks/useAuth.js', () => ({ useAuth: () => useAuthMock() }));

// Lockout and VerifyEmail have their own timers/Firebase/toast side effects
// that are out of scope for a guard-branching test — stubbed to a plain
// marker so we can assert ProtectedRoute picked the right branch.
vi.mock('@/pages/LockoutPage/Lockout.jsx', () => ({
    default: () => <div data-testid="lockout" />,
}));
vi.mock('@/features/auth/pages/VerifyEmailPage/VerifyEmail.jsx', () => ({
    default: () => <div data-testid="verify-email" />,
}));

describe('ProtectedRoute', () => {
    it('shows the Loader while the initial auth check is in flight', () => {
        useAuthMock.mockReturnValue({ user: null, loading: true });

        render(
            <ProtectedRoute>
                <div>secret content</div>
            </ProtectedRoute>
        );

        expect(screen.getByText(/authentication verification/i)).toBeInTheDocument();
        expect(screen.queryByText('secret content')).not.toBeInTheDocument();
    });

    it('shows Lockout when there is no signed-in user', () => {
        useAuthMock.mockReturnValue({ user: null, loading: false });

        render(
            <ProtectedRoute>
                <div>secret content</div>
            </ProtectedRoute>
        );

        expect(screen.getByTestId('lockout')).toBeInTheDocument();
        expect(screen.queryByText('secret content')).not.toBeInTheDocument();
    });

    it('shows VerifyEmail when the user is signed in but not email-verified', () => {
        useAuthMock.mockReturnValue({ user: { uid: 'u1', emailVerified: false }, loading: false });

        render(
            <ProtectedRoute>
                <div>secret content</div>
            </ProtectedRoute>
        );

        expect(screen.getByTestId('verify-email')).toBeInTheDocument();
        expect(screen.queryByText('secret content')).not.toBeInTheDocument();
    });

    it('renders the children when the user is signed in and email-verified', () => {
        useAuthMock.mockReturnValue({ user: { uid: 'u1', emailVerified: true }, loading: false });

        render(
            <ProtectedRoute>
                <div>secret content</div>
            </ProtectedRoute>
        );

        expect(screen.getByText('secret content')).toBeInTheDocument();
        expect(screen.queryByTestId('lockout')).not.toBeInTheDocument();
        expect(screen.queryByTestId('verify-email')).not.toBeInTheDocument();
    });
});
