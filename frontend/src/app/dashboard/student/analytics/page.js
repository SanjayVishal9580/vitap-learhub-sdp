'use client';
import { useEffect, useState } from 'react';
import { getStudentAnalytics } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function StudentAnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    getStudentAnalytics().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>📊 Growth Analytics</h1>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {[
          { icon: '⚡', value: data?.stats?.totalXP || 0, label: 'Total XP', color: '#6366f1' },
          { icon: '📈', value: `Lvl ${data?.stats?.level || 1}`, label: 'Level', color: '#8b5cf6' },
          { icon: '🔥', value: data?.stats?.streak || 0, label: 'Day Streak', color: '#f59e0b' },
          { icon: '📝', value: data?.stats?.totalQuizzes || 0, label: 'Total Quizzes', color: '#10b981' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
            <div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* XP Progress to next level */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Level Progress</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Level {data?.stats?.level || 1}</span>
          <span>{(data?.stats?.totalXP || 0) % 100}/100 XP to next level</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${(data?.stats?.totalXP || 0) % 100}%` }}></div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedAttempt ? '1fr 400px' : '1fr', gap: 24, transition: 'all 0.3s ease' }}>
        <div>
          {/* Quiz History */}
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>📝 Quiz History</h2>
          {data?.quizAttempts?.length > 0 ? (
            <div className="table-container">
              <table>
                <thead><tr><th>Course</th><th>Topic</th><th>Score</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>
                  {data.quizAttempts.slice(0, 20).map(a => (
                    <tr key={a._id} style={{ cursor: 'pointer', background: selectedAttempt?._id === a._id ? 'var(--bg-tertiary)' : '' }} onClick={() => setSelectedAttempt(a)}>
                      <td>{a.courseId?.courseCode}</td>
                      <td>{a.topicId?.topicName}</td>
                      <td><strong>{a.score}/{a.totalQuestions}</strong></td>
                      <td><span className={`badge ${a.status === 'PASSED' ? 'badge-success' : a.status === 'FAILED' ? 'badge-danger' : 'badge-warning'}`}>{a.status}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Review</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No quizzes taken yet</div></div>
          )}
        </div>

        {selectedAttempt && (
          <div className="card animate-slide-in" style={{ height: 'fit-content', position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Quiz Details</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => setMaximized(true)} 
                  title="Maximize"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 8px' }}>
                  ⛶
                </button>
                <button 
                  onClick={() => setSelectedAttempt(null)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 8px' }}>
                  ✕
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{selectedAttempt.topicId?.topicName}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <span className="badge badge-accent">Score: {selectedAttempt.score}/{selectedAttempt.totalQuestions}</span>
                <span className="badge badge-info">{selectedAttempt.difficulty}</span>
              </div>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 8 }}>
              {selectedAttempt.questions?.map((q, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 12, border: `1px solid ${q.isCorrect ? 'var(--success)' : 'var(--error)'}`, background: q.isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }} className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {`${i + 1}. ${q.question}`}
                    </ReactMarkdown>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div>Your answer: <span style={{ color: q.isCorrect ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>{q.studentAnswer || '(Skipped)'}</span></div>
                    {!q.isCorrect && <div>Correct: <span style={{ color: 'var(--success)', fontWeight: 600 }}>{q.correctAnswer}</span></div>}
                  </div>
                </div>
              ))}
              {(!selectedAttempt.questions || selectedAttempt.questions.length === 0) && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No question details available for this attempt.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Maximized Quiz Details Modal */}
      {maximized && selectedAttempt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
          backdropFilter: 'blur(4px)',
        }} onClick={() => setMaximized(false)}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 16,
            padding: 32,
            maxWidth: 900,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Quiz Details</h2>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                  {selectedAttempt.topicId?.topicName} • {selectedAttempt.courseId?.courseCode}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={() => setMaximized(false)} 
                  title="Minimize"
                  style={{ 
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    cursor: 'pointer', 
                    fontSize: '1.2rem',
                    padding: '8px 12px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.target.style.background = 'var(--bg-secondary)'}
                >
                  ⛶
                </button>
                <button 
                  onClick={() => {
                    setMaximized(false);
                    setSelectedAttempt(null);
                  }}
                  style={{ 
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    cursor: 'pointer', 
                    fontSize: '1.2rem',
                    padding: '8px 12px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.target.style.background = 'var(--bg-secondary)'}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Score & Metadata */}
            <div className="grid-3" style={{ marginBottom: 32, gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>Score</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: selectedAttempt.status === 'PASSED' ? 'var(--success)' : 'var(--error)' }}>
                  {selectedAttempt.score}/{selectedAttempt.totalQuestions}
                </div>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>Status</div>
                <span className={`badge ${selectedAttempt.status === 'PASSED' ? 'badge-success' : selectedAttempt.status === 'FAILED' ? 'badge-danger' : 'badge-warning'}`}>
                  {selectedAttempt.status}
                </span>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>Date</div>
                <div style={{ fontSize: '0.95rem' }}>{new Date(selectedAttempt.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {/* Questions */}
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>Questions Review</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedAttempt.questions?.map((q, i) => (
                <div 
                  key={i} 
                  style={{ 
                    padding: 16, 
                    borderRadius: 12, 
                    border: `2px solid ${q.isCorrect ? 'var(--success)' : 'var(--error)'}`, 
                    background: q.isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: 12, marginBottom: 12 }}>
                    <div style={{ 
                      minWidth: 32, 
                      height: 32, 
                      borderRadius: 8, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      background: q.isCorrect ? 'var(--success)' : 'var(--error)',
                      color: 'white'
                    }}>
                      {q.isCorrect ? '✓' : '✗'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }} className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {`Q${i + 1}. ${q.question}`}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Your Answer:</span>
                      <div style={{ 
                        marginTop: 4, 
                        padding: 8, 
                        borderRadius: 6, 
                        background: 'var(--bg-secondary)',
                        color: q.isCorrect ? 'var(--success)' : 'var(--error)',
                        fontWeight: 600
                      }}>
                        {q.studentAnswer || '(Skipped)'}
                      </div>
                    </div>
                    {!q.isCorrect && (
                      <div style={{ fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Correct Answer:</span>
                        <div style={{ 
                          marginTop: 4, 
                          padding: 8, 
                          borderRadius: 6, 
                          background: 'var(--bg-secondary)',
                          color: 'var(--success)',
                          fontWeight: 600
                        }}>
                          {q.correctAnswer}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!selectedAttempt.questions || selectedAttempt.questions.length === 0) && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: 32 }}>
                  No question details available for this attempt.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Achievements */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 32, marginBottom: 16 }}>🏅 Achievements</h2>
      {user?.achievements?.length > 0 ? (
        <div className="grid-4">
          {user.achievements.map((a, i) => (
            <div key={i} className="card" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.description}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><div className="empty-state-icon">🏅</div><div className="empty-state-title">No achievements yet</div><p>Complete quizzes to earn achievements!</p></div>
      )}
    </div>
  );
}
