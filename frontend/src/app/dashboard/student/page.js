'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMyEnrolled, requestCourse, unenrollStudent, sendMessageToAdmin, getMyAdminMessages } from '@/lib/api';
import toast from 'react-hot-toast';
import styles from './student.module.css';

export default function StudentDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState([]);
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

  useEffect(() => {
    loadData();
    loadAdminMessages();
  }, []);

  const loadAdminMessages = async () => {
    try {
      const data = await getMyAdminMessages();
      setAdminMessages(data);
    } catch (err) { console.error(err); }
  };

  const handleAdminMessageSubmit = async (e) => {
    e.preventDefault();
    try {
      await sendMessageToAdmin(adminMessageForm);
      toast.success('Message sent to admin successfully!');
      setShowAdminMessageModal(false);
      setAdminMessageForm({ subject: '', content: '' });
      loadAdminMessages();
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const loadData = async () => {
    try {
      const data = await getMyEnrolled();
      setEnrollments(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  
  const handleUnenroll = async () => {
    if (!unenrollTarget) return;
    setUnenrolling(true);
    try {
      await unenrollStudent(unenrollTarget.courseId, unenrollTarget.teacherId);
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

  const completedTopics = enrollments.reduce((sum, e) => sum + (e.completedTopics?.length || 0), 0);

  return (
    <div className="animate-fade">
      <div className={styles.welcomeCard}>
        <div>
          <h1 className={styles.welcomeTitle}>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className={styles.welcomeDesc}>Continue your learning journey. You're doing great!</p>
        </div>
        <div className={styles.welcomeStats}>
          <div className={styles.welcomeStat}>
            <span className={styles.welcomeStatValue}>{user?.xp || 0}</span>
            <span className={styles.welcomeStatLabel}>Total XP</span>
          </div>
          <div className={styles.welcomeStat}>
            <span className={styles.welcomeStatValue}>{user?.streak || 0} 🔥</span>
            <span className={styles.welcomeStatLabel}>Day Streak</span>
          </div>
          <div className={styles.welcomeStat}>
            <span className={styles.welcomeStatValue}>Lvl {user?.level || 1}</span>
            <span className={styles.welcomeStatLabel}>Level</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: '📚', value: enrollments.length, label: 'Enrolled Courses', color: '#6366f1' },
          { icon: '✅', value: completedTopics, label: 'Topics Completed', color: '#10b981' },
          { icon: '🧠', value: user?.totalQuizzes || 0, label: 'Quizzes Taken', color: '#f59e0b' },
          { icon: '🏆', value: user?.achievements?.length || 0, label: 'Achievements', color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Enrolled Courses */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>My Courses</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAdminMessageModal(true)}>Message Admin</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRequestModal(true)}>Request Course</button>
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/student/courses')}>
            Browse All Courses →
          </button>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-title">No courses enrolled yet</div>
          <p>Browse available courses and start learning!</p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/student/courses')} style={{ marginTop: 16 }}>
            Browse Courses
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {enrollments.map((enrollment) => (
            <div key={enrollment._id} className="card card-hover" style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/dashboard/student/courses/${enrollment.courseId?._id}?teacher=${enrollment.teacherId?._id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="badge badge-accent">{enrollment.courseId?.courseCode}</span>
                <span className="badge badge-success">{enrollment.completedTopics?.length || 0} completed</span>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>{enrollment.courseId?.courseName}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                👨‍🏫 {enrollment.teacherId?.name}
              </p>
              <div className="progress-bar" style={{ marginBottom: 12 }}>
                <div className="progress-fill" style={{ width: '0%' }}></div>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ width: '100%', color: '#ef4444', borderColor: '#fee2e2' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setUnenrollTarget({ 
                    courseId: enrollment.courseId?._id, 
                    teacherId: enrollment.teacherId?._id,
                    courseName: enrollment.courseId?.courseName
                  });
                }}
              >
                Leave Course
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Achievements */}
      {user?.achievements?.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 32, marginBottom: 16 }}>🏅 Achievements</h2>
          <div className="grid-4">
            {user.achievements.map((a, i) => (
              <div key={i} className="card" style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>{a.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.description}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Request New Course</h3>
            <p style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Suggest a new course you would like to see on the platform. An admin will review your request.</p>
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
                <button type="submit" className="btn btn-primary">Submit Suggestion</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {unenrollTarget && (
        <div className="modal-overlay" onClick={() => setUnenrollTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3 className="modal-title" style={{ color: '#ef4444' }}>⚠️ Unenroll from Course?</h3>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Course: {unenrollTarget.courseName}</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Are you sure you want to unenroll? This action has the following consequences:
              </p>
              <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8, paddingLeft: 20 }}>
                <li>Your progress in this course will be permanently deleted.</li>
                <li>All your quiz attempts and scores for this course will be removed.</li>
                <li>Your comments and AI tutor sessions for this course will be deleted.</li>
                <li>You will be removed from all groups associated with this course.</li>
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
              Send a message to the VITAP LearnHub support team.
            </p>
            <form onSubmit={handleAdminMessageSubmit}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input className="form-input" required value={adminMessageForm.subject} onChange={e => setAdminMessageForm({...adminMessageForm, subject: e.target.value})} placeholder="e.g. Issue with Course, Feature Request" />
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
