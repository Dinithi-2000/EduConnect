import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sendChatMessage, getChatHistory } from '../services/aiService';
import './AIChatWidget.css';

const quickPrompts = [
  'Create a 7-day study plan',
  'Explain polymorphism simply',
  'How do I prepare for exams?',
  'Suggest a quick revision routine'
];

const timeLabel = (dateLike) => {
  const date = dateLike ? new Date(dateLike) : new Date();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const normalizeHistoryItems = (items = []) => {
  return items
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content)
    .map((item) => ({
      id: item.id || `${item.role}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      role: item.role,
      content: item.content,
      time: item.createdAt || new Date().toISOString()
    }));
};

const AIChatWidget = ({ darkMode = false, studentId = 'guest-student', context = {}, openSignal = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome-assistant',
      role: 'assistant',
      content: 'Hi. I am your EduConnect Assistant. Ask me for study plans, topic explanations, and quiz prep help.',
      time: new Date().toISOString()
    }
  ]);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const messagesRef = useRef(null);
  const pendingOpenSignal = useRef(openSignal);

  useEffect(() => {
    if (pendingOpenSignal.current !== openSignal) {
      pendingOpenSignal.current = openSignal;
      setIsOpen(true);
    }
  }, [openSignal]);

  useEffect(() => {
    if (!isOpen || hasLoadedHistory) return;

    const loadHistory = async () => {
      try {
        const response = await getChatHistory(studentId);
        const loadedMessages = normalizeHistoryItems(response?.data || []);
        if (loadedMessages.length > 0) {
          setMessages(loadedMessages);
        }
      } catch {
        // Keep local welcome message when history is unavailable.
      } finally {
        setHasLoadedHistory(true);
      }
    };

    loadHistory();
  }, [isOpen, hasLoadedHistory, studentId]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, isSending, isOpen]);

  const compactHistory = useMemo(() => {
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }, [messages]);

  const sendMessage = async (rawMessage) => {
    const text = String(rawMessage || '').trim();
    if (!text || isSending) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      time: new Date().toISOString()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const response = await sendChatMessage(text, compactHistory, context, studentId);
      const replyText = response?.reply || 'I could not generate a response right now.';

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          time: new Date().toISOString()
        }
      ]);

      setSuggestions(Array.isArray(response?.suggestions) ? response.suggestions : []);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: 'I cannot reach the AI service right now. Please make sure the backend server is running.',
          time: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-assistant-reset',
        role: 'assistant',
        content: 'Chat reset. Ask me anything about your studies.',
        time: new Date().toISOString()
      }
    ]);
    setSuggestions([]);
  };

  return (
    <div className={`chat-widget ${darkMode ? 'dark' : ''}`}>
      {isOpen && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div className="chat-title-group">
              <h3>EduConnect Assistant</h3>
              <span className="chat-status">Online</span>
            </div>
            <div className="chat-header-actions">
              <button type="button" className="chat-control-btn" onClick={clearChat}>New chat</button>
              <button type="button" className="chat-control-btn close" onClick={() => setIsOpen(false)}>Close</button>
            </div>
          </div>

          <div className="chat-messages" ref={messagesRef}>
            {messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.role}`}>
                <div className="chat-bubble">{message.content}</div>
                <span className="chat-time">{timeLabel(message.time)}</span>
              </div>
            ))}

            {isSending && (
              <div className="chat-message assistant">
                <div className="chat-bubble typing-bubble">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-quick-prompts">
            {(suggestions.length ? suggestions : quickPrompts).slice(0, 4).map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="prompt-chip"
                onClick={() => sendMessage(prompt)}
                disabled={isSending}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            className="chat-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            <input
              type="text"
              className="chat-input"
              placeholder="Ask your study question..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isSending}
            />
            <button type="submit" className="chat-send-btn" disabled={!input.trim() || isSending}>Send</button>
          </form>
        </div>
      )}

      <button type="button" className="chat-fab" onClick={() => setIsOpen((prev) => !prev)}>
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
};

export default AIChatWidget;
