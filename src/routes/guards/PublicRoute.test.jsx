import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublicRoute from './PublicRoute.jsx';
import { ROUTES } from '@/routes/paths.js';

const useAuthMock = vi.fn();
vi.mock('@/hooks/useAuth.js', () => ({ useAuth: () => useAuthMock() }));

// Stub Navigate so this doesn't need a real Router context — just assert on
// the `to`/`replace` props it was given.
vi.mock('react-router-dom', () => ({
    Navigate: ({ to, replace }) => <div data-testid="navigate" data-to={to} data-replace={String(replace)} />,
}));

describe('PublicRoute', () => {
    it('shows the Loader while the initial auth check is in flight', () => {
        useAuthMock.mockReturnValue({ user: null, loading: true });

        render(
            <PublicRoute>
                <div>sign-in form</div>
            </PublicRoute>
        );

        expect(screen.getByText(/checking session/i)).toBeInTheDocument();
        expect(screen.queryByText('sign-in form')).not.toBeInTheDocument();
    });

    it('redirects an already-signed-in user straight to /chat', () => {
        useAuthMock.mockReturnValue({ user: { uid: 'u1' }, loading: false });

        render(
            <PublicRoute>
                <div>sign-in form</div>
            </PublicRoute>
        );

        const nav = screen.getByTestId('navigate');
        expect(nav).toHaveAttribute('data-to', ROUTES.chat);
        expect(nav).toHaveAttribute('data-replace', 'true');
        expect(screen.queryByText('sign-in form')).not.toBeInTheDocument();
    });

    it('renders the children when no user is signed in', () => {
        useAuthMock.mockReturnValue({ user: null, loading: false });

        render(
            <PublicRoute>
                <div>sign-in form</div>
            </PublicRoute>
        );

        expect(screen.getByText('sign-in form')).toBeInTheDocument();
        expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
});
