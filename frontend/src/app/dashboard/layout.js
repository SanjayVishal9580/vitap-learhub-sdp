'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import styles from './dashboard.module.css';

const studentNav = [
  { href: '/dashboard/student', icon: '🏠', label: 'Dashboard' },
  { href: '/dashboard/student/courses', icon: '📚', label: 'Courses' },
  { href: '/dashboard/student/analytics', icon: '📊', label: 'Analytics' },
  { href: '/dashboard/student/papers', icon: '📄', label: 'Past Papers' },
  { href: '/dashboard/student/groups', icon: '💬', label: 'Study Groups' },
  { href: '/dashboard/student/leaderboard', icon: '🏆', label: 'Leaderboard' },
];

const teacherNav = [
  { href: '/dashboard/teacher', icon: '🏠', label: 'Dashboard' },
  { href: '/dashboard/teacher/courses', icon: '📚', label: 'My Courses' },
  { href: '/dashboard/teacher/analytics', icon: '📊', label: 'Analytics' },
  { href: '/dashboard/teacher/papers', icon: '📄', label: 'Past Papers' },
];

const adminNav = [
  { href: '/dashboard/admin', icon: '🏠', label: 'Dashboard' },
  { href: '/dashboard/admin/courses', icon: '📚', label: 'Courses' },
  { href: '/dashboard/admin/users', icon: '👥', label: 'Users' },
  { href: '/dashboard/admin/papers', icon: '📄', label: 'Past Papers' },
  { href: '/dashboard/admin/quizzes', icon: '⚠️', label: 'Flagged Quizzes' },
];

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return <div className="loading-page"><div className="spinner"></div><p>Loading...</p></div>;
  }
  if (!user) return null;

  const navItems = user.role === 'admin' ? adminNav : user.role === 'teacher' ? teacherNav : studentNav;

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)}></div>}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed} ${mobileOpen ? styles.sidebarMobileOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo} onClick={() => router.push('/')}>
            <span className={styles.logoEmoji}>🎓</span>
            {sidebarOpen && <span className={styles.logoLabel}>Learn<span className={styles.logoAccent}>Hub</span></span>}
          </div>
          <button className={styles.collapseBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => (
            <button key={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
              onClick={() => { router.push(item.href); setMobileOpen(false); }}
              title={item.label}>
              <span className={styles.navIcon}>{item.icon}</span>
              {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.navItem} onClick={toggleTheme} title="Toggle Theme">
            <span className={styles.navIcon}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            {sidebarOpen && <span className={styles.navLabel}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={logout} title="Logout">
            <span className={styles.navIcon}>🚪</span>
            {sidebarOpen && <span className={styles.navLabel}>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`${styles.main} ${sidebarOpen ? styles.mainShifted : styles.mainFull}`}>
        {/* Top bar */}
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setMobileOpen(true)}>☰</button>
          <div className={styles.topbarRight}>
            {user.role === 'student' && (
              <div className={styles.topbarStats}>
                <span className={styles.statChip}>⚡ {user.xp || 0} XP</span>
                <span className={styles.statChip}>🔥 {user.streak || 0} Streak</span>
                <span className={styles.statChip}>📈 Lvl {user.level || 1}</span>
              </div>
            )}
            <div className={styles.userInfo}>
              <div className={styles.avatar}>{user.name?.charAt(0).toUpperCase()}</div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userRole}>{user.role}</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
