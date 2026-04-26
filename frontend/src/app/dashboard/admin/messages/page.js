'use client';
import { useEffect, useState } from 'react';
import { getAllAdminMessages, replyToAdminMessage } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, replied, resolved

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async () => {
    try {
      const data = await getAllAdminMessages();
      setMessages(data);
    } catch (err) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    try {
      await replyToAdminMessage(replyingTo._id, { adminReply: replyContent, status: 'replied' });
      toast.success('Reply sent!');
      setReplyingTo(null);
      setReplyContent('');
      loadMessages();
    } catch (err) {
      toast.error(err.message || 'Failed to send reply');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await replyToAdminMessage(id, { status });
      toast.success(`Status updated to ${status}`);
      loadMessages();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const filtered = messages.filter(m => filter === 'all' || m.status === filter);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📩 User Messages</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'pending', 'replied', 'resolved'].map(f => (
            <button 
              key={f} 
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map(msg => (
          <div key={msg._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ 
                  width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-gradient)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 
                }}>
                  {msg.senderId?.name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{msg.subject}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    From: {msg.senderId?.name} ({msg.senderId?.role}) • {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <span className={`badge ${
                msg.status === 'replied' ? 'badge-success' : 
                msg.status === 'pending' ? 'badge-warning' : 
                'badge-info'
              }`}>{msg.status}</span>
            </div>

            <p style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 10, fontSize: '0.95rem', lineHeight: 1.5, marginBottom: 16 }}>
              {msg.content}
            </p>

            {msg.adminReply && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10, borderLeft: '4px solid var(--accent-color)', marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: 4 }}>ADMIN REPLY:</div>
                <p style={{ fontSize: '0.9rem' }}>{msg.adminReply}</p>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Replied on {new Date(msg.repliedAt).toLocaleString()}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setReplyingTo(msg)}>
                {msg.adminReply ? 'Edit Reply' : 'Reply'}
              </button>
              {msg.status !== 'resolved' && (
                <button className="btn btn-success btn-sm" onClick={() => updateStatus(msg._id, 'resolved')}>
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📩</div>
            <div className="empty-state-title">No messages found</div>
            <p>User messages will appear here.</p>
          </div>
        )}
      </div>

      {replyingTo && (
        <div className="modal-overlay" onClick={() => setReplyingTo(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Reply to {replyingTo.senderId?.name}</h3>
            <p style={{ marginBottom: 12, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <strong>Subject:</strong> {replyingTo.subject}
            </p>
            <form onSubmit={handleReplySubmit}>
              <div className="form-group">
                <label className="form-label">Your Reply</label>
                <textarea 
                  className="form-textarea" 
                  required 
                  rows={5} 
                  value={replyContent} 
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Type your response here..."
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Send Reply</button>
                <button type="button" className="btn btn-secondary" onClick={() => setReplyingTo(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
