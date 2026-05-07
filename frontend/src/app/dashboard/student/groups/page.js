'use client';
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { createGroup, joinGroup, getMyGroups, getGroupMessages, leaveGroup, uploadGroupFile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const msgEndRef = useRef(null);

  useEffect(() => {
    loadGroups();
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      if (user?._id) socket.emit('user_online', user._id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('new_message', (msg) => {
      console.log('New message received:', msg);
      setMessages(prev => [...prev, msg]);
    });

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadGroups = async () => {
    try { const data = await getMyGroups(); setGroups(data); }
    catch (err) {}
    finally { setLoading(false); }
  };

  const handleSelectGroup = async (group) => {
    console.log('Selecting group:', group._id);
    setSelectedGroup(group);
    socketRef.current?.emit('join_group', group._id, (error) => {
      if (error) {
        console.error('Failed to join group:', error);
      } else {
        console.log('Successfully joined group room');
      }
    });
    try { 
      const msgs = await getGroupMessages(group._id); 
      console.log('Loaded messages:', msgs.length);
      setMessages(msgs); 
    }
    catch (err) {
      console.error('Failed to load messages:', err);
      toast.error('Failed to load messages');
    }
  };

  const handleSend = () => {
    if (!newMsg.trim() || !selectedGroup) return;
    
    console.log('Sending message:', { groupId: selectedGroup._id, senderName: user.name, content: newMsg });
    
    socketRef.current?.emit('send_message', {
      groupId: selectedGroup._id, 
      senderId: user._id,
      senderName: user.name, 
      content: newMsg, 
      type: 'text',
    }, (error) => {
      if (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message');
      } else {
        console.log('Message sent successfully');
      }
    });
    setNewMsg('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const msg = await uploadGroupFile(selectedGroup._id, formData);
      socketRef.current?.emit('broadcast_new_message', msg);
    } catch (err) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    try {
      const group = await createGroup({ name: groupName });
      toast.success(`Group created! Passcode: ${group.passcode}`);
      setGroupName(''); setShowCreate(false); loadGroups();
    } catch (err) { toast.error(err.message); }
  };

  const handleJoin = async () => {
    if (!passcode.trim()) return;
    try {
      await joinGroup(passcode);
      toast.success('Joined group!');
      setPasscode(''); setShowJoin(false); loadGroups();
    } catch (err) { toast.error(err.message); }
  };

  const handleLeave = async (groupId) => {
    try { await leaveGroup(groupId); toast.success('Left group'); setSelectedGroup(null); loadGroups(); }
    catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>💬 Study Groups</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Create Group</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowJoin(true)}>🔑 Join Group</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedGroup ? '300px 1fr' : '1fr', gap: 20, minHeight: 500 }}>
        {/* Group list */}
        <div>
          {groups.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">💬</div><div className="empty-state-title">No groups yet</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groups.map(g => (
                <div key={g._id} className={`card card-hover`}
                  style={{ padding: 16, cursor: 'pointer', borderColor: selectedGroup?._id === g._id ? 'var(--accent)' : '' }}
                  onClick={() => handleSelectGroup(g)}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{g.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    👥 {g.members?.length}/{g.maxMembers} • 🔑 {g.passcode}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat area */}
        {selectedGroup && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            {/* Chat header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{selectedGroup.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedGroup.members?.length} members • Passcode: {selectedGroup.passcode}
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => handleLeave(selectedGroup._id)}>Leave</button>
            </div>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 300, maxHeight: 400 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.senderId === user._id ? 'flex-end' : 'flex-start',
                  maxWidth: '70%', padding: 12, borderRadius: 12,
                  background: msg.senderId === user._id ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                }}>
                  {msg.senderId !== user._id && <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>{msg.senderName}</div>}
                  {msg.type === 'image' ? (
                    <div style={{ marginBottom: 4 }}>
                      <img src={msg.fileUrl} alt="Attachment" style={{ maxWidth: '100%', borderRadius: 8 }} />
                      {msg.content && msg.content !== 'Shared a file' && <div style={{ fontSize: '0.9rem', marginTop: 4 }}>{msg.content}</div>}
                    </div>
                  ) : msg.type === 'video' ? (
                    <div style={{ marginBottom: 4 }}>
                      <video src={msg.fileUrl} controls style={{ maxWidth: '100%', borderRadius: 8 }} />
                      {msg.content && msg.content !== 'Shared a file' && <div style={{ fontSize: '0.9rem', marginTop: 4 }}>{msg.content}</div>}
                    </div>
                  ) : msg.type === 'file' ? (
                    <div style={{ marginBottom: 4 }}>
                      <a href={msg.fileUrl} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(0,0,0,0.1)', borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
                        📎 <span style={{ textDecoration: 'underline' }}>{msg.fileName || 'Download File'}</span>
                      </a>
                      {msg.content && msg.content !== 'Shared a file' && <div style={{ fontSize: '0.9rem', marginTop: 4 }}>{msg.content}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  )}
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div ref={msgEndRef}></div>
            </div>
            {/* Input */}
            <div style={{ padding: 16, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ cursor: 'pointer', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)', opacity: uploading ? 0.5 : 1 }}>
                📎
                <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx" />
              </label>
              <input type="text" className="form-input" placeholder="Type a message..." value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
              <button className="btn btn-primary" onClick={handleSend} disabled={uploading}>Send</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Create Study Group</h3>
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input className="form-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. DSA Study Squad" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Join Study Group</h3>
            <div className="form-group">
              <label className="form-label">Passcode</label>
              <input className="form-input" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Enter group passcode" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleJoin}>Join</button>
              <button className="btn btn-secondary" onClick={() => setShowJoin(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
