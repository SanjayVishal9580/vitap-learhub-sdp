'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getMyEnrolled, getTeacherAnalytics } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

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

                {/* Charts Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 24 }}>
                  {/* Student Performance Overview */}
                  {analytics.students?.length > 0 && (
                    <div className="card">
                      <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>👥 Student Completion Rates</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={analytics.students
                            .slice(0, 10)
                            .map(s => ({
                              name: s.name.split(' ')[0],
                              completed: s.completedCount || 0,
                              total: analytics.topicAnalytics?.length || 1,
                              percentage: Math.round(((s.completedCount || 0) / (analytics.topicAnalytics?.length || 1)) * 100),
                            }))}
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" stroke="var(--text-muted)" />
                          <YAxis dataKey="name" type="category" stroke="var(--text-muted)" width={100} />
                          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(value) => `${value}%`} />
                          <Bar dataKey="percentage" fill="#6366f1" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Topic Pass Rates */}
                  {analytics.topicAnalytics?.length > 0 && (
                    <div className="card">
                      <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>🎯 Topic Pass Rates</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={analytics.topicAnalytics.map(t => ({
                            topic: t.topicName?.substring(0, 15) || 'Unknown',
                            passRate: t.passRate || 0,
                            attempts: t.totalAttempts || 0,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="topic" stroke="var(--text-muted)" angle={-45} textAnchor="end" height={80} />
                          <YAxis stroke="var(--text-muted)" />
                          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(value) => `${value}%`} />
                          <Bar dataKey="passRate" fill="#10b981" radius={[8, 8, 0, 0]}>
                            {analytics.topicAnalytics.map((t, idx) => (
                              <Cell
                                key={`cell-${idx}`}
                                fill={t.passRate >= 75 ? '#10b981' : t.passRate >= 50 ? '#f59e0b' : '#ef4444'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Quiz Attempts Timeline */}
                {analytics.students?.length > 0 && (
                  <div className="card">
                    <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>📊 Class Performance Timeline</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart
                        data={analytics.topicAnalytics?.map((t, idx) => ({
                          topic: t.topicName?.substring(0, 12) || `Topic ${idx + 1}`,
                          avgScore: t.avgScore || 0,
                          attempts: t.totalAttempts || 0,
                        })) || []}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="topic" stroke="var(--text-muted)" />
                        <YAxis stroke="var(--text-muted)" yAxisId="left" />
                        <YAxis stroke="var(--text-muted)" yAxisId="right" orientation="right" />
                        <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8 }} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="avgScore" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} name="Avg Score" />
                        <Line yAxisId="right" type="monotone" dataKey="attempts" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} name="Attempts" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

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

