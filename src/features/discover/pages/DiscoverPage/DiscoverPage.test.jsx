import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DiscoverPage from './DiscoverPage.jsx';

const useAuthMock = vi.fn();
vi.mock('@/hooks/useAuth.js', () => ({ useAuth: () => useAuthMock() }));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

// AppShell pulls in IconRail (nav/presence/sign-out) — irrelevant to search
// behavior, so it's stubbed down to just its children.
vi.mock('@/components/layout/AppShell/AppShell.jsx', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

const searchUsersMock = vi.fn();
const getUserMock = vi.fn();
vi.mock('@/features/chat/services/userService.js', () => ({
    searchUsers: (...args) => searchUsersMock(...args),
    getUser: (...args) => getUserMock(...args),
}));

vi.mock('@/features/chat/services/chatService.js', () => ({
    createOrGetChat: vi.fn(),
}));

beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { uid: 'me' } });
    searchUsersMock.mockReset().mockResolvedValue([]);
    getUserMock.mockReset().mockResolvedValue(null);
    localStorage.clear();
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

function typeSearch(value) {
    fireEvent.change(screen.getByPlaceholderText(/search by username or email/i), { target: { value } });
}

describe('DiscoverPage', () => {
    it('debounces the search call by ~300ms after typing stops', async () => {
        render(<DiscoverPage />);

        typeSearch('ali');
        expect(searchUsersMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(299);
        expect(searchUsersMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(searchUsersMock).toHaveBeenCalledTimes(1);
    });

    it('always passes the current user\'s uid to searchUsers, so they are excluded from their own results', async () => {
        render(<DiscoverPage />);

        typeSearch('ali');
        await vi.advanceTimersByTimeAsync(300);

        expect(searchUsersMock).toHaveBeenCalledWith('ali', 'me');
    });

    it('shows the empty-results message when a search returns nothing', async () => {
        searchUsersMock.mockResolvedValue([]);
        render(<DiscoverPage />);

        typeSearch('nobody-matches-this');
        await vi.advanceTimersByTimeAsync(300);

        expect(screen.getByText(/no users found for that username or email/i)).toBeInTheDocument();
    });

    it('renders matching results returned by searchUsers', async () => {
        searchUsersMock.mockResolvedValue([{ id: 'u2', uid: 'u2', name: 'Alice', username: 'alice1' }]);
        render(<DiscoverPage />);

        typeSearch('ali');
        await vi.advanceTimersByTimeAsync(300);

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('@alice1')).toBeInTheDocument();
    });

    it('clears results and shows the default prompt when the search box is emptied', async () => {
        searchUsersMock.mockResolvedValue([{ id: 'u2', uid: 'u2', name: 'Alice', username: 'alice1' }]);
        render(<DiscoverPage />);

        typeSearch('ali');
        await vi.advanceTimersByTimeAsync(300);
        expect(screen.getByText('Alice')).toBeInTheDocument();

        typeSearch('');
        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
        expect(screen.getByText(/search for people by username or email/i)).toBeInTheDocument();
    });
});
