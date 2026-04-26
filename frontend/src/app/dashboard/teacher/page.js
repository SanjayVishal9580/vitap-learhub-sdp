'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMyEnrolled, requestCourse, unenrollTeacher, sendMessageToAdmin, getMyAdminMessages } from '@/lib/api';
import toast from 'react-hot-toast';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ courseCode: '', courseName: '', description: '', credits: 3, category: 'Core' });
  const [unenrollTarget, setUnenrollTarget] = useState(null);
  const [unenrolling, setUnenrolling] = useState(false);
  const [showAdminMessageModal, setShowAdminMessageModal] = useState(false);
  const [adminMessageForm, setAdminMessageForm] = useState({ subject: '', content: '' });
  const [adminMessages, setAdminMessages] = useState([]);
  const [showMessagesList, setShowMessagesList] = useState(false);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestCourse(requestForm);
      toast.success('Course request submitted successfully!');
      setShowRequestModal(false);
      setRequestForm({ courseCode: '', courseName: '', description: '', credits: 3, category: 'Core' });
    } catch (err) {
      toast.error(err.message || 'Failed to submit course request');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getMyEnrolled();
      setMyCourses(data);
      const messages = await getMyAdminMessages();
      setAdminMessages(messages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdminMessageSubmit = async (e) => {
    e.preventDefault();
    try {
      await sendMessageToAdmin(adminMessageForm);
      toast.success('Message sent to admin successfully!');
      setShowAdminMessageModal(false);
      setAdminMessageForm({ subject: '', content: '' });
      const messages = await getMyAdminMessages();
      setAdminMessages(messages);
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const handleUnenroll = async () => {
    if (!unenrollTarget) return;
    setUnenrolling(true);
    try {
      await unenrollTeacher(unenrollTarget.courseId);
      toast.success('Successfully unenrolled from the course');
      setUnenrollTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to unenroll');
    } finally {
      setUnenrolling(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <div style={{ background: 'var(--accent-gradient)', borderRadius: 20, padding: 32, color: '#fff', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>Welcome, {user?.name} 👨‍🏫</h1>
        <p style={{ opacity: 0.9 }}>Manage your courses, track student performance, and create content.</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: '📚', value: myCourses.length, label: 'My Courses', color: '#6366f1' },
          { icon: '👥', value: '-', label: 'Total Students', color: '#10b981' },
          { icon: '📝', value: '-', label: 'Topics Created', color: '#f59e0b' },
          { icon: '📊', value: '-', label: 'Avg Pass Rate', color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
            <div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>My Courses</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAdminMessageModal(true)}>Message Admin</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRequestModal(true)}>Request Course</button>
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/teacher/courses')}>Manage Courses →</button>
        </div>
      </div>

      {myCourses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-title">No courses yet</div>
          <p>Enroll in courses to start teaching</p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/teacher/courses')} style={{ marginTop: 16 }}>Browse Courses</button>
        </div>
      ) : (
        <div className="grid-3">
          {myCourses.map(c => (
            <div key={c._id} className="card card-hover" style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/dashboard/teacher/courses/${c._id}`)}>
              <span className="badge badge-accent">{c.courseCode}</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: 8, marginBottom: 12 }}>{c.courseName}</h3>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ width: '100%', color: '#ef4444', borderColor: '#fee2e2' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setUnenrollTarget({ 
                    courseId: c._id, 
                    courseName: c.courseName 
                  });
                }}
              >
                Leave Course
              </button>
            </div>
          ))}
        </div>
      )}

      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Request New Course</h3>
            <p style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Propose a new course to be added to the platform. An admin will review your request.</p>
            <form onSubmit={handleRequestSubmit}>
              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input className="form-input" required value={requestForm.courseCode} onChange={e => setRequestForm({...requestForm, courseCode: e.target.value})} placeholder="e.g. CSE101" />
              </div>
              <div className="form-group">
                <label className="form-label">Course Name</label>
                <input className="form-input" required value={requestForm.courseName} onChange={e => setRequestForm({...requestForm, courseName: e.target.value})} placeholder="e.g. Intro to CS" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" required value={requestForm.description} onChange={e => setRequestForm({...requestForm, description: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Credits</label>
                  <input type="number" className="form-input" required value={requestForm.credits} onChange={e => setRequestForm({...requestForm, credits: parseInt(e.target.value)})} min="1" max="10" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={requestForm.category} onChange={e => setRequestForm({...requestForm, category: e.target.value})}>
                    <option>Core</option>
                    <option>Elective</option>
                    <option>Lab</option>
                    <option>Project</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Submit Request</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {unenrollTarget && (
        <div className="modal-overlay" onClick={() => setUnenrollTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3 className="modal-title" style={{ color: '#ef4444' }}>⚠️ Stop Teaching Course?</h3>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Course: {unenrollTarget.courseName}</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Are you sure you want to unenroll? This action has the following consequences:
              </p>
              <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8, paddingLeft: 20 }}>
                <li>All topics and content you created for this course will be deleted.</li>
                <li>All students enrolled under you will be unenrolled.</li>
                <li>All student quiz attempts and comments for your topics will be removed.</li>
                <li>Your papers uploaded for this course will be deleted.</li>
                <li style={{ color: 'var(--text-success)', fontWeight: 600 }}>Your total XP and Level will NOT be affected.</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn btn-primary" 
                style={{ background: '#ef4444', flex: 1 }}
                onClick={handleUnenroll}
                disabled={unenrolling}
              >
                {unenrolling ? 'Unenrolling...' : 'Yes, Unenroll'}
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setUnenrollTarget(null)}
                disabled={unenrolling}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showAdminMessageModal && (
        <div className="modal-overlay" onClick={() => setShowAdminMessageModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Contact Administrator</h3>
            <p style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Send a message to the VITAP LearnHub admin team.
            </p>
            <form onSubmit={handleAdminMessageSubmit}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" required value={adminMessageForm.subject} onChange={e => setAdminMessageForm({...adminMessageForm, subject: e.target.value})} placeholder="e.g. Technical Issue, Syllabus Correction" />
              </div>
              <div className="form-group">
                <label className="form-label">Message Content</label>
                <textarea className="form-textarea" required rows={5} value={adminMessageForm.content} onChange={e => setAdminMessageForm({...adminMessageForm, content: e.target.value})} placeholder="Describe your issue or request in detail..." />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Send Message</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdminMessageModal(false)}>Cancel</button>
                <button type="button" className="btn btn-info" style={{ marginLeft: 'auto' }} onClick={() => { setShowAdminMessageModal(false); setShowMessagesList(true); }}>View My Messages</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMessagesList && (
        <div className="modal-overlay" onClick={() => setShowMessagesList(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="modal-title" style={{ marginBottom: 0 }}>My Messages to Admin</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowMessagesList(false)}>Close</button>
            </div>
            
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
              {adminMessages.length === 0 ? (
                <p style={{ textAlign: 'center', py: 20, color: 'var(--text-muted)' }}>No messages sent yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {adminMessages.map(msg => (
                    <div key={msg._id} className="card" style={{ padding: 16, background: 'var(--bg-tertiary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <h4 style={{ fontWeight: 700 }}>{msg.subject}</h4>
                        <span className={`badge ${msg.status === 'replied' ? 'badge-success' : 'badge-info'}`}>{msg.status}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>{msg.content}</p>
                      {msg.adminReply && (
                        <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent-color)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>Admin Reply:</div>
                          <p style={{ fontSize: '0.85rem' }}>{msg.adminReply}</p>
                        </div>
                      )}
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
                        Sent on {new Date(msg.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={() => { setShowMessagesList(false); setShowAdminMessageModal(true); }}>Send New Message</button>
          </div>
        </div>
      )}
    </div>
  );
}
