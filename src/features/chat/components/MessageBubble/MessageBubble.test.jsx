import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageBubble from './MessageBubble.jsx';

const baseMessage = {
    id: 'm1',
    senderId: 'u1',
    text: 'Hello world',
    createdAt: '2026-09-23T12:00:00.000Z',
    status: 'sent',
};

describe('MessageBubble', () => {
    it('renders a plain text message', () => {
        render(<MessageBubble message={baseMessage} isOwn={false} onDelete={vi.fn()} />);
        expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders a rich link-preview card for a link-kind message', () => {
        const message = {
            ...baseMessage,
            text: undefined,
            kind: 'link',
            url: 'https://example.com',
            title: 'Example Site',
            subtitle: 'An example',
        };

        render(<MessageBubble message={message} isOwn={false} onDelete={vi.fn()} />);

        expect(screen.getByText('Example Site')).toBeInTheDocument();
        expect(screen.getByText('An example')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /example site/i })).toHaveAttribute('href', 'https://example.com');
    });

    it('renders an image attachment as a clickable thumbnail', () => {
        const message = {
            ...baseMessage,
            text: '',
            attachment: { url: 'data:image/png;base64,AAAA', name: 'photo.png', type: 'image/png', size: 1234 },
        };

        render(<MessageBubble message={message} isOwn={false} onDelete={vi.fn()} />);

        const img = screen.getByAltText('photo.png');
        expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    });

    it('renders a non-image attachment as a file card with name and formatted size', () => {
        const message = {
            ...baseMessage,
            text: '',
            attachment: { url: 'data:application/pdf;base64,AAAA', name: 'doc.pdf', type: 'application/pdf', size: 2048 },
        };

        render(<MessageBubble message={message} isOwn={false} onDelete={vi.fn()} />);

        expect(screen.getByText('doc.pdf')).toBeInTheDocument();
        expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });

    it('renders a deleted message as a tombstone, with no attachment content', () => {
        const message = { ...baseMessage, deleted: true, text: '', attachment: null };

        render(<MessageBubble message={message} isOwn={true} onDelete={vi.fn()} />);

        expect(screen.getByText('This message was deleted')).toBeInTheDocument();
        expect(screen.queryByText('Hello world')).not.toBeInTheDocument();
    });

    it('shows the status tick only on the current user\'s own messages', () => {
        const { container, rerender } = render(<MessageBubble message={baseMessage} isOwn={true} onDelete={vi.fn()} />);
        expect(container.querySelector('.bubble-tick')).not.toBeNull();

        rerender(<MessageBubble message={baseMessage} isOwn={false} onDelete={vi.fn()} />);
        expect(container.querySelector('.bubble-tick')).toBeNull();
    });

    it('shows the delete button only on own, non-deleted messages', () => {
        const { rerender } = render(<MessageBubble message={baseMessage} isOwn={true} onDelete={vi.fn()} />);
        expect(screen.getByTitle('Delete message')).toBeInTheDocument();

        rerender(<MessageBubble message={baseMessage} isOwn={false} onDelete={vi.fn()} />);
        expect(screen.queryByTitle('Delete message')).not.toBeInTheDocument();

        const deletedOwnMessage = { ...baseMessage, deleted: true, text: '', attachment: null };
        rerender(<MessageBubble message={deletedOwnMessage} isOwn={true} onDelete={vi.fn()} />);
        expect(screen.queryByTitle('Delete message')).not.toBeInTheDocument();
    });
});
