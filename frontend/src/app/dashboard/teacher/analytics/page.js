'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getMyEnrolled, getTeacherAnalytics } from '@/lib/api';
import toast from 'react-hot-toast';

function AnalyticsContent() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get('courseId');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const enrolledCourses = await getMyEnrolled();
        setCourses(enrolledCourses);
        if (initialCourseId) {
          loadAnalytics(initialCourseId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [initialCourseId]);

  const loadAnalytics = async (courseId) => {
    setSelectedCourse(courseId);
    setLoading(true);
    try {
      const data = await getTeacherAnalytics(courseId);
      setAnalytics(data);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analytics) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📊 Class Analytics</h1>
        {selectedCourse && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedCourse(null); setAnalytics(null); }}>
            ← Back to Courses
          </button>
        )}
      </div>

      {!selectedCourse ? (
        <div className="grid-3">
          {courses.map(c => (
            <div key={c._id} className="card card-hover" style={{ cursor: 'pointer' }} onClick={() => loadAnalytics(c._id)}>
              <span className="badge badge-accent">{c.courseCode}</span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 8 }}>{c.courseName}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Click to view detailed performance →</p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {analytics && (
              <>
                <div className="grid-3">
                  {[
                    { icon: '👥', value: analytics.studentCount, label: 'Students', color: '#6366f1' },
                    { icon: '📝', value: analytics.totalAttempts, label: 'Quiz Attempts', color: '#10b981' },
                    { icon: '📖', value: analytics.topicAnalytics?.length || 0, label: 'Topics', color: '#f59e0b' },
                  ].map((s, i) => (
                    <div key={i} className="stat-card">
                      <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
                      <div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
                    </div>
                  ))}
                </div>

                {/* Performance Distribution */}
                <div className="card">
                  <h3 style={{ marginBottom: 20, fontSize: '1rem' }}>Performance Distribution</h3>
                  {Object.entries(analytics.distribution || {}).map(([range, count]) => (
                    <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ width: 80, fontSize: '0.85rem', fontWeight: 600 }}>{range}%</span>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${analytics.totalAttempts > 0 ? (count/analytics.totalAttempts*100) : 0}%` }}></div>
                      </div>
                      <span style={{ width: 40, textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{count}</span>
                    </div>
                  ))}
                </div>

                {/* Topic Analytics */}
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Topic Performance Breakdown</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {analytics.topicAnalytics?.map(t => (
                      <div key={t.topicId} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{t.topicName}</h3>
                          <span className={`badge ${t.passRate >= 75 ? 'badge-success' : t.passRate >= 55 ? 'badge-warning' : 'badge-danger'}`}>
                            {t.passRate}% pass rate
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                          <span>📝 {t.totalAttempts} attempts</span>
                          <span>📊 Avg Score: {t.avgScore}/10</span>
                        </div>
                        {t.recommendations?.length > 0 && (
                          <div style={{ marginTop: 8, padding: 12, borderRadius: 10, background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
                            <strong style={{ fontSize: '0.8rem', color: 'var(--accent)', display: 'block', marginBottom: 4 }}>🤖 AI Recommendations for this topic:</strong>
                            <ul style={{ paddingLeft: 16, fontSize: '0.85rem' }}>
                              {t.recommendations.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Student Roster Sidebar */}
          <div className="card" style={{ position: 'sticky', top: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: '1rem' }}>👥 Student Roster</h3>
            {analytics?.students?.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No students enrolled yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {analytics?.students?.map(s => (
                  <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, background: 'var(--bg-tertiary)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                      {s.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Level {s.level} • {s.xp} XP</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>{s.completedCount}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Done</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherAnalyticsPage() {
  return (
    <Suspense fallback={<div className="loading-page"><div className="spinner"></div></div>}>
      <AnalyticsContent />
    </Suspense>
  );
}

