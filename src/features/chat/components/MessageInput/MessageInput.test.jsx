import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessageInput from './MessageInput.jsx';

afterEach(() => {
    vi.useRealTimers();
});

describe('MessageInput — typing throttle', () => {
    it('sends onTyping(true) on the first keystroke, then throttles further keystrokes within the window', async () => {
        vi.useFakeTimers();
        const onTyping = vi.fn();
        render(<MessageInput onSend={vi.fn()} onSendAttachment={vi.fn()} onTyping={onTyping} />);
        const input = screen.getByPlaceholderText('Type your message here..');

        fireEvent.change(input, { target: { value: 'h' } });
        expect(onTyping).toHaveBeenCalledTimes(1);
        expect(onTyping).toHaveBeenLastCalledWith(true);

        // Still inside the 2500ms throttle window — no second `true` call.
        fireEvent.change(input, { target: { value: 'he' } });
        expect(onTyping).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(2500);
        fireEvent.change(input, { target: { value: 'hel' } });
        expect(onTyping).toHaveBeenCalledTimes(2);
        expect(onTyping).toHaveBeenLastCalledWith(true);
    });

    it('sends onTyping(false) after the stop-typing delay with no further keystrokes', async () => {
        vi.useFakeTimers();
        const onTyping = vi.fn();
        render(<MessageInput onSend={vi.fn()} onSendAttachment={vi.fn()} onTyping={onTyping} />);
        const input = screen.getByPlaceholderText('Type your message here..');

        fireEvent.change(input, { target: { value: 'hello' } });
        onTyping.mockClear();

        await vi.advanceTimersByTimeAsync(3000);
        expect(onTyping).toHaveBeenCalledWith(false);
    });

    it('sends onTyping(false) immediately on blur', () => {
        const onTyping = vi.fn();
        render(<MessageInput onSend={vi.fn()} onSendAttachment={vi.fn()} onTyping={onTyping} />);
        const input = screen.getByPlaceholderText('Type your message here..');

        fireEvent.change(input, { target: { value: 'hello' } });
        onTyping.mockClear();

        fireEvent.blur(input);
        expect(onTyping).toHaveBeenCalledWith(false);
    });
});

describe('MessageInput — oversize attachment rejection', () => {
    it('rejects a non-image file over the ~700KB cap at pick-time, without staging it', () => {
        const onSendAttachment = vi.fn();
        const { container } = render(
            <MessageInput onSend={vi.fn()} onSendAttachment={onSendAttachment} onTyping={vi.fn()} />
        );
        const fileInput = container.querySelector('input[type="file"]');

        const bigFile = new File([new Uint8Array(701 * 1024)], 'big.bin', { type: 'application/octet-stream' });
        fireEvent.change(fileInput, { target: { files: [bigFile] } });

        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
        // No pending-attachment chip was staged.
        expect(screen.queryByText('big.bin')).not.toBeInTheDocument();
    });

    it('accepts a non-image file under the cap and stages it', () => {
        const { container } = render(<MessageInput onSend={vi.fn()} onSendAttachment={vi.fn()} onTyping={vi.fn()} />);
        const fileInput = container.querySelector('input[type="file"]');

        const smallFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
        fireEvent.change(fileInput, { target: { files: [smallFile] } });

        expect(screen.getByText('notes.txt')).toBeInTheDocument();
    });
});

describe('MessageInput — send routing', () => {
    it('sends plain text via onSend (trimmed) when there is no pending attachment', () => {
        const onSend = vi.fn();
        const onSendAttachment = vi.fn();
        render(<MessageInput onSend={onSend} onSendAttachment={onSendAttachment} onTyping={vi.fn()} />);

        const input = screen.getByPlaceholderText('Type your message here..');
        fireEvent.change(input, { target: { value: '  hello there  ' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        expect(onSend).toHaveBeenCalledWith('hello there');
        expect(onSendAttachment).not.toHaveBeenCalled();
    });

    it('does not call onSend for an empty/whitespace-only message', () => {
        const onSend = vi.fn();
        render(<MessageInput onSend={onSend} onSendAttachment={vi.fn()} onTyping={vi.fn()} />);

        fireEvent.change(screen.getByPlaceholderText('Type your message here..'), { target: { value: '   ' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        expect(onSend).not.toHaveBeenCalled();
    });

    it('routes to onSendAttachment with the typed caption when a file is pending, not onSend', async () => {
        const onSend = vi.fn();
        const onSendAttachment = vi.fn().mockResolvedValue(undefined);
        const { container } = render(
            <MessageInput onSend={onSend} onSendAttachment={onSendAttachment} onTyping={vi.fn()} />
        );

        const fileInput = container.querySelector('input[type="file"]');
        const smallFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
        fireEvent.change(fileInput, { target: { files: [smallFile] } });

        const textInput = container.querySelector('.message-input-field');
        fireEvent.change(textInput, { target: { value: 'a caption' } });

        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        await waitFor(() => expect(onSendAttachment).toHaveBeenCalledTimes(1));
        expect(onSendAttachment).toHaveBeenCalledWith(smallFile, 'a caption');
        expect(onSend).not.toHaveBeenCalled();
    });
});
