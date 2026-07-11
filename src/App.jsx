import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DEFAULT_MODEL = 'llama3';
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434/api/generate';

function buildPrompt(history, latestMessage) {
  const conversation = history
    .map((entry) => `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`)
    .join('\n');

  return `${conversation}\nUser: ${latestMessage}`.trim();
}

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const hasMessages = useMemo(() => messages.length > 0, [messages]);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedInput = input.trim();
    if (!normalizedInput || isLoading) {
      return;
    }

    const userMessage = { id: Date.now().toString(), role: 'user', content: normalizedInput };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          prompt: buildPrompt(nextMessages, normalizedInput),
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const assistantReply = data?.response?.trim() || 'I can help with HR questions about benefits, time off, and policies.';
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant`, role: 'assistant', content: assistantReply },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to contact the assistant.';
      setError(message);
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant-error`, role: 'assistant', content: 'Sorry, I could not reach the AI service right now.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function clearThread() {
    setMessages([]);
    setError('');
    setInput('');
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">HR support prototype</p>
          <h1>Ask about benefits, time off, and policies</h1>
        </div>
        <button type="button" className="secondary-button" onClick={clearThread} disabled={isLoading && !hasMessages}>
          Clear thread
        </button>
      </header>

      <main className="chat-panel">
        <section className="message-list" aria-live="polite">
          {messages.length === 0 ? (
            <div className="empty-state" data-testid="empty-state">
              <p>Start a conversation with the HR assistant.</p>
            </div>
          ) : (
            messages.map((message) => (
              <article key={message.id} className={`message ${message.role}`}>
                <div className="message-label">{message.role === 'user' ? 'You' : 'Assistant'}</div>
                {message.role === 'assistant' ? (
                  <div className="message-content markdown-body" data-testid="assistant-message">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="message-content" data-testid="user-message">
                    {message.content}
                  </div>
                )}
              </article>
            ))
          )}
          {isLoading ? <div className="loading-pill">Thinking…</div> : null}
          {error ? (
            <div className="error-banner" role="alert" data-testid="error-message">
              {error}
            </div>
          ) : null}
        </section>

        <form className="composer" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="message-input">
            Ask the HR assistant
          </label>
          <textarea
            id="message-input"
            data-testid="message-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your question here"
            rows={3}
            disabled={isLoading}
          />
          <div className="composer-actions">
            <button type="submit" className="primary-button" disabled={!input.trim() || isLoading}>
              {isLoading ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default App;
