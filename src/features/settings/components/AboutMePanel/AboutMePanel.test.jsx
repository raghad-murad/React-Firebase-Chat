import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AboutMePanel from './AboutMePanel.jsx';

const useAuthMock = vi.fn();
vi.mock('@/hooks/useAuth.js', () => ({ useAuth: () => useAuthMock() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

const updateUserProfileMock = vi.fn();
vi.mock('@/features/chat/services/userService.js', () => ({
    updateUserProfile: (...args) => updateUserProfileMock(...args),
}));

beforeEach(() => {
    updateUserProfileMock.mockReset().mockResolvedValue(undefined);
});

function renderInSetupMode({ username = '', refreshUser = vi.fn() } = {}) {
    useAuthMock.mockReturnValue({
        user: { uid: 'u1', email: 'john@example.com', displayName: 'John Doe' },
        // profileCompleted !== true puts the panel straight into edit mode
        // with a "Save & continue" button, so these tests don't first need
        // to click "Edit".
        profile: { firstName: 'John', lastName: 'Doe', username, profileCompleted: false },
        refreshUser,
    });
    return render(<AboutMePanel />);
}

describe('AboutMePanel — username validation on save', () => {
    it('blocks save and shows the required error when username is empty', () => {
        renderInSetupMode({ username: '' });

        fireEvent.click(screen.getByRole('button', { name: /save & continue/i }));

        expect(updateUserProfileMock).not.toHaveBeenCalled();
        expect(screen.getByText('Username is required.')).toBeInTheDocument();
    });

    it('blocks save and shows the format error for an invalid username', () => {
        renderInSetupMode({ username: 'johndoe' });

        fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'John Doe' } });
        fireEvent.click(screen.getByRole('button', { name: /save & continue/i }));

        expect(updateUserProfileMock).not.toHaveBeenCalled();
        // Shows twice: once as the inline field error, once as the toast —
        // any instance confirms the right message was surfaced.
        expect(screen.getAllByText(/username can only use lowercase letters/i).length).toBeGreaterThan(0);
    });

    it('saves when the username is valid, and refreshes the auth user afterward', async () => {
        const refreshUser = vi.fn().mockResolvedValue(undefined);
        renderInSetupMode({ username: 'johndoe', refreshUser });

        fireEvent.click(screen.getByRole('button', { name: /save & continue/i }));

        await waitFor(() => expect(updateUserProfileMock).toHaveBeenCalledTimes(1));

        const [uid, fields] = updateUserProfileMock.mock.calls[0];
        expect(uid).toBe('u1');
        expect(fields.username).toBe('johndoe');
        expect(fields.firstName).toBe('John');
        expect(fields.lastName).toBe('Doe');

        expect(refreshUser).toHaveBeenCalledTimes(1);
    });
});
