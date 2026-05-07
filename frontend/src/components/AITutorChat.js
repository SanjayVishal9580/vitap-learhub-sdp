'use client';
import { useState, useRef, useEffect } from 'react';
import { askTutor } from '@/lib/api';
import toast from 'react-hot-toast';

const animationStyles = `
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
`;

export default function AITutorChat({ topicId = null, topicName = 'General', compact = false }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMaximized, setChatMaximized] = useState(false);
  const [chatOpen, setChatOpen] = useState(!compact);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = { role: 'user', content: chatInput, timestamp: new Date() };
    setChatMessages([...chatMessages, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const response = await askTutor({ 
        topicId: topicId,
        topicName: topicName,
        question: chatInput 
      });
      const aiMessage = { role: 'assistant', content: response.response, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('AI response error:', err);
      
      // Show user-friendly error messages
      let errorMsg = 'Failed to get AI response';
      if (err.message.includes('OpenRouter API key') || err.message.includes('OPENROUTER_API_KEY')) {
        errorMsg = '🔑 AI Tutor setup needed: Add OPENROUTER_API_KEY to backend/.env';
      } else if (err.message.includes('not configured') || err.message.includes('not found')) {
        errorMsg = '⚙️ AI Tutor not configured. Check OPENROUTER_SETUP.md';
      } else if (err.message.includes('invalid') || err.message.includes('Unauthorized')) {
        errorMsg = '❌ Invalid API key. Check your OpenRouter credentials.';
      } else if (err.message.includes('rate limit') || err.message.includes('429')) {
        errorMsg = '⏱️ Rate limited. Please wait a moment.';
      } else if (err.message.includes('temporarily unavailable')) {
        errorMsg = '🚫 AI service is down. Try again later.';
      }
      
      toast.error(errorMsg);
      setChatMessages(prev => prev.slice(0, -1)); // Remove user message if error
    } finally {
      setChatLoading(false);
    }
  };

  // Compact floating widget mode
  if (compact) {
    return (
      <>
        <style>{animationStyles}</style>
        {/* Chat Maximized Overlay */}
        {chatMaximized && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              cursor: 'pointer',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={() => setChatMaximized(false)}
          />
        )}

        {/* Floating AI Tutor Widget */}
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: 'var(--bg-secondary)',
          border: '2px solid #6366f1',
          borderRadius: 20,
          padding: chatOpen ? 16 : 12,
          boxShadow: chatOpen ? '0 20px 50px rgba(99, 102, 241, 0.3)' : '0 8px 16px rgba(0, 0, 0, 0.15)',
          minWidth: chatOpen ? 340 : 'auto',
          maxWidth: chatMaximized ? '90vw' : 400,
          maxHeight: chatMaximized ? '90vh' : (chatOpen ? 550 : 'auto'),
          display: 'flex',
          flexDirection: 'column',
          zIndex: chatMaximized ? 1001 : 999,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: chatOpen ? 'slideUp 0.3s ease-out' : 'none',
          ...(chatMaximized && {
            position: 'fixed',
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            transform: 'translate(-50%, -50%)',
            width: '90vw',
            height: '85vh',
            maxWidth: 850,
            maxHeight: '85vh',
          })
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: chatOpen ? 12 : 0, paddingBottom: chatOpen ? 12 : 0, borderBottom: chatOpen ? '1px solid var(--border-color)' : 'none' }}>
            {chatOpen && (
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                🤖 AI Tutor
              </h3>
            )}
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              {chatOpen && (
                <button 
                  onClick={() => setChatMaximized(!chatMaximized)} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '1.1rem', 
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    hover: { background: 'var(--bg-tertiary)' }
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.target.style.background = 'none'}
                  title={chatMaximized ? 'Minimize' : 'Maximize'}
                >
                  {chatMaximized ? '⬇️' : '⬆️'}
                </button>
              )}
              <button 
                onClick={() => setChatOpen(!chatOpen)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                {chatOpen ? '✕' : '💬'}
              </button>
            </div>
          </div>

          {chatOpen && (
            <>
              {/* Topic Info */}
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'var(--text-muted)', 
                marginBottom: 12, 
                paddingBottom: 12, 
                borderBottom: '1px solid var(--border-color)',
                fontWeight: '600',
                letterSpacing: '0.5px'
              }}>
                📚 <strong>{topicName}</strong>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: 12,
                paddingRight: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                {chatMessages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.7 }}>🎓</div>
                    <div style={{ lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Welcome to AI Tutor!</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Ask any questions or clarify your doubts</div>
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    animation: 'slideUp 0.3s ease-out',
                  }}>
                    <div style={{
                      maxWidth: '75%',
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.role === 'user' 
                        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                        : 'var(--bg-tertiary)',
                      color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      wordWrap: 'break-word',
                      boxShadow: msg.role === 'user' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
                      transition: 'all 0.2s',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '16px 16px 16px 4px',
                      background: 'var(--bg-tertiary)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center'
                    }}>
                      <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block' }}>●</span>
                      <span style={{ animation: 'pulse 1.5s infinite 0.2s', display: 'inline-block' }}>●</span>
                      <span style={{ animation: 'pulse 1.5s infinite 0.4s', display: 'inline-block' }}>●</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                  placeholder="Ask a question..."
                  disabled={chatLoading}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                <button
                  onClick={handleSendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: chatLoading || !chatInput.trim() 
                      ? 'var(--bg-tertiary)' 
                      : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: chatLoading || !chatInput.trim() ? 'var(--text-muted)' : 'white',
                    cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '44px',
                    boxShadow: chatLoading || !chatInput.trim() ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  {chatLoading ? '⏳' : '✈️'}
                </button>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  // Full page mode (for course detail)
  return (
    <>
      <style>{animationStyles}</style>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '2px solid #6366f1',
        borderRadius: 20,
        padding: 16,
        boxShadow: '0 20px 50px rgba(99, 102, 241, 0.2)',
        minWidth: 340,
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.3s ease-out',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: chatOpen ? 12 : 0, paddingBottom: chatOpen ? 12 : 0, borderBottom: chatOpen ? '1px solid var(--border-color)' : 'none' }}>
          {chatOpen && (
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🤖 AI Tutor
            </h3>
          )}
          <button 
            onClick={() => setChatOpen(!chatOpen)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.1rem', 
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              transition: 'all 0.2s',
              marginLeft: 'auto'
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
          >
            {chatOpen ? '✕' : '↔'}
          </button>
        </div>

        {chatOpen && (
          <>
            {/* Topic Info */}
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              marginBottom: 12, 
              paddingBottom: 12, 
              borderBottom: '1px solid var(--border-color)',
              fontWeight: '600',
              letterSpacing: '0.5px'
            }}>
              📚 <strong>{topicName}</strong>
            </div>

            {/* Messages */}
            <div style={{
              maxHeight: 350,
              overflowY: 'auto',
              marginBottom: 12,
              paddingRight: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', flexDirection: 'column' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.7 }}>🎓</div>
                  <div style={{ lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Welcome to AI Tutor!</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Ask any questions or clarify your doubts</div>
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'slideUp 0.3s ease-out',
                }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.role === 'user' 
                      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                      : 'var(--bg-tertiary)',
                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    wordWrap: 'break-word',
                    boxShadow: msg.role === 'user' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'var(--bg-tertiary)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center'
                  }}>
                    <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block' }}>●</span>
                    <span style={{ animation: 'pulse 1.5s infinite 0.2s', display: 'inline-block' }}>●</span>
                    <span style={{ animation: 'pulse 1.5s infinite 0.4s', display: 'inline-block' }}>●</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                placeholder="Ask a question..."
                disabled={chatLoading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
              <button
                onClick={handleSendChat}
                disabled={chatLoading || !chatInput.trim()}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: chatLoading || !chatInput.trim() 
                    ? 'var(--bg-tertiary)' 
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: chatLoading || !chatInput.trim() ? 'var(--text-muted)' : 'white',
                  cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '44px',
                  boxShadow: chatLoading || !chatInput.trim() ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                {chatLoading ? '⏳' : '✈️'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
