'use client';
import { useEffect, useState } from 'react';
import { getFlaggedQuizzes, invalidateQuiz } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminFlaggedQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const data = await getFlaggedQuizzes(); setQuizzes(data); }
    catch (err) {} finally { setLoading(false); }
  };

  const handleInvalidate = async (id) => {
    try { await invalidateQuiz(id); toast.success('Quiz invalidated'); loadData(); }
    catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>⚠️ Flagged Quizzes</h1>
      {quizzes.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-title">No flagged quizzes</div><p>All quiz attempts look clean!</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {quizzes.map(q => (
            <div key={q._id} className="card" style={{ borderColor: 'var(--danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span className="badge badge-danger">FLAGGED</span>
                  <span className={`badge ${q.status === 'INVALIDATED' ? 'badge-warning' : 'badge-info'}`} style={{ marginLeft: 8 }}>{q.status}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(q.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><strong>Student:</strong> {q.studentId?.name} ({q.studentId?.email})</div>
                <div><strong>Course:</strong> {q.courseId?.courseCode}</div>
                <div><strong>Topic:</strong> {q.topicId?.topicName}</div>
                <div><strong>Score:</strong> {q.score}/{q.totalQuestions}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--danger-light)', marginBottom: 12 }}>
                <strong>🚩 Flags:</strong> {q.flagReason}
                <div style={{ marginTop: 6, fontSize: '0.85rem' }}>
                  Tab Switches: {q.tabSwitches} | Fullscreen Exits: {q.fullscreenExits} | Time: {q.timeTaken}s
                </div>
              </div>
              {q.status !== 'INVALIDATED' && (
                <button className="btn btn-danger btn-sm" onClick={() => handleInvalidate(q._id)}>🚫 Invalidate Quiz</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
