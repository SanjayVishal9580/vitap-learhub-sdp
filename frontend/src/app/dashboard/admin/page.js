'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminAnalytics, getAdminStats } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { 
    Promise.all([getAdminAnalytics(), getAdminStats()])
      .then(([analyticsData, statsData]) => {
        setStats({ ...analyticsData, pendingRequests: statsData.pendingRequests });
      })
      .catch(console.error)
      .finally(() => setLoading(false)); 
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', borderRadius: 20, padding: 32, color: '#fff', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>Admin Dashboard 🛡️</h1>
        <p style={{ opacity: 0.9 }}>Monitor platform activity, review papers, and manage users.</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        {[
          { icon: '🎒', value: stats?.totalStudents || 0, label: 'Students', color: '#6366f1' },
          { icon: '👨‍🏫', value: stats?.totalTeachers || 0, label: 'Teachers', color: '#10b981' },
          { icon: '📚', value: stats?.totalCourses || 0, label: 'Courses', color: '#f59e0b' },
          { icon: '📥', value: stats?.pendingRequests || 0, label: 'Pending Requests', color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ cursor: 'pointer' }}>
            <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
            <div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
      <div className="grid-3">
        {[
          { title: 'Course Management', desc: 'Create, edit, and delete courses globally', icon: '📚', href: '/dashboard/admin/courses' },
          { title: 'Topics Management', desc: 'Edit topics, links, and PPT files', icon: '📖', href: '/dashboard/admin/topics' },
          { title: 'Course Requests', desc: 'Review requested courses from users', icon: '📥', href: '/dashboard/admin/requests', badge: stats?.pendingRequests },
          { title: 'User Management', desc: 'View and manage all user roles', icon: '👥', href: '/dashboard/admin/users' },
          { title: 'Paper Approvals', desc: 'Review and approve pending papers', icon: '📄', href: '/dashboard/admin/papers' },
          { title: 'User Messages', desc: 'View and reply to user support messages', icon: '📩', href: '/dashboard/admin/messages' },
          { title: 'Flagged Quizzes', desc: 'Review suspicious quiz activity', icon: '⚠️', href: '/dashboard/admin/quizzes' },
        ].map((item, i) => (
          <div key={i} className="card card-hover" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => router.push(item.href)}>
            {item.badge > 0 && (
              <div style={{
                position: 'absolute',
                top: -8,
                right: -8,
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                animation: 'pulse 2s infinite'
              }}>
                🔔 {item.badge}
              </div>
            )}
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>{item.icon}</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{item.title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
