import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('HR chatbot UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prevents invalid submissions and disables the send button for empty input', async () => {
    render(<App />);

    const input = screen.getByTestId('message-input');
    const button = screen.getByRole('button', { name: /send/i });

    expect(button).toBeDisabled();

    await userEvent.type(input, '   ');
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders user and assistant messages, resets the input, and uses the Ollama API structure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Here is a helpful reply.' }),
    });
    global.fetch = fetchMock;

    render(<App />);

    const input = screen.getByTestId('message-input');
    const button = screen.getByRole('button', { name: /send/i });

    await userEvent.type(input, 'What is the vacation policy?');
    expect(button).not.toBeDisabled();

    await userEvent.click(button);

    expect(await screen.findByText('What is the vacation policy?')).toBeInTheDocument();
    expect(await screen.findByText('Here is a helpful reply.')).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue(''));

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('What is the vacation policy?'),
      })
    );
  });
});
