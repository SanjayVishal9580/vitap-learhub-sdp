'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { askTutor, getAITutorHistory } from '@/lib/api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  { href: '/dashboard/teacher/papers', icon: '📄', label: 'Upload Papers' },
];

const adminNav = [
  { href: '/dashboard/admin', icon: '🏠', label: 'Dashboard' },
  { href: '/dashboard/admin/courses', icon: '📚', label: 'Courses' },
  { href: '/dashboard/admin/users', icon: '👥', label: 'Users' },
  { href: '/dashboard/admin/papers', icon: '📄', label: 'Paper Approvals' },
  { href: '/dashboard/admin/quizzes', icon: '⚠️', label: 'Flagged Quizzes' },
];

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Global Tools State
  const [showAI, setShowAI] = useState(false);
  const [aiMaximized, setAiMaximized] = useState(false);
  const [aiChat, setAiChat] = useState([]);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Detect fullscreen mode (quiz is active)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const [showPomodoro, setShowPomodoro] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState('work');
  const [pomodoroWorkTime, setPomodoroWorkTime] = useState(25);
  const [pomodoroBreakTime, setPomodoroBreakTime] = useState(5);
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);

  // Load Pomodoro Settings
  useEffect(() => {
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setPomodoroWorkTime(settings.workTime || 25);
        setPomodoroBreakTime(settings.breakTime || 5);
        setPomodoroTime(settings.workTime ? settings.workTime * 60 : 25 * 60);
      } catch (e) {}
    }
  }, []);

  // Pomodoro Timer Logic
  useEffect(() => {
    let timer;
    if (pomodoroActive && pomodoroTime > 0) {
      timer = setInterval(() => setPomodoroTime(t => t - 1), 1000);
    } else if (pomodoroActive && pomodoroTime === 0) {
      if (pomodoroMode === 'work') {
        toast.success('Work session complete! Time for a break 🎉');
        setPomodoroMode('break');
        setPomodoroTime(pomodoroBreakTime * 60);
      } else {
        toast.success('Break complete! Ready for another session 💪');
        setPomodoroMode('work');
        setPomodoroTime(pomodoroWorkTime * 60);
      }
      setPomodoroActive(false);
    }
    return () => clearInterval(timer);
  }, [pomodoroActive, pomodoroTime, pomodoroMode, pomodoroWorkTime, pomodoroBreakTime]);

  const handleAsk = async () => {
    if (!aiQuestion.trim()) return;
    const q = aiQuestion;
    setAiChat(prev => [...prev, { role: 'user', content: q }]);
    setAiQuestion('');
    setAiLoading(true);
    try {
      // Try to get topic context if on a course page
      const topicId = params?.id; 
      const { response } = await askTutor({
        topicId: topicId || 'general',
        topicName: 'General Assistant',
        quizContext: '',
        question: q,
      });
      setAiChat(prev => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      setAiChat(prev => [...prev, { role: 'model', content: 'Sorry, I am having trouble responding right now.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleAITutor = async () => {
    setShowAI(!showAI);
    if (!showAI && aiChat.length === 0) {
      const topicId = params?.id || 'general';
      try {
        const history = await getAITutorHistory(topicId);
        if (history && history.length > 0) {
          setAiChat(history.map(h => ({ role: h.role, content: h.content })));
        } else {
          setAiChat([{ role: 'model', content: "Hi! I'm your AI Assistant. How can I help you today?" }]);
        }
      } catch (err) {
        setAiChat([{ role: 'model', content: "Hi! Let's learn together." }]);
      }
    }
  };

  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return <div className="loading-page"><div className="spinner"></div><p>Loading...</p></div>;
  }
  if (!user) return null;

  // Role-based route protection
  const isPathAllowed = () => {
    if (pathname.startsWith('/dashboard/admin') && user.role !== 'admin') return false;
    if (pathname.startsWith('/dashboard/teacher') && user.role !== 'teacher') return false;
    if (pathname.startsWith('/dashboard/student') && user.role !== 'student') return false;
    return true;
  };

  if (!isPathAllowed()) {
    const defaultRoutes = { student: '/dashboard/student', teacher: '/dashboard/teacher', admin: '/dashboard/admin' };
    router.push(defaultRoutes[user.role] || '/dashboard/student');
    return null;
  }

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
            <div className={styles.userInfo} onClick={() => router.push('/profile')} style={{ cursor: 'pointer' }}>
              <div className={styles.avatar} style={{ background: user.avatar ? `url(${user.avatar})` : 'var(--primary-color)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                {!user.avatar && user.name?.charAt(0).toUpperCase()}
              </div>
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

        {/* Global Floating Tools */}
        <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 1000 }}>
          <button onClick={() => setShowPomodoro(!showPomodoro)}
            style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', border: 'none', fontSize: '1.4rem', cursor: 'pointer', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ⏰
          </button>
          {!isFullscreen && (
            <button onClick={toggleAITutor}
              style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', border: 'none', fontSize: '1.4rem', cursor: 'pointer', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🤖
            </button>
          )}
        </div>

        {/* Pomodoro Timer Window */}
        {showPomodoro && (
          <div style={{ position: 'fixed', bottom: 100, right: 24, zIndex: 1001, width: 300 }} className="card animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>⏰ Pomodoro Timer</h4>
              <button onClick={() => setShowPomodoro(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: pomodoroMode === 'work' ? 'var(--primary-color)' : 'var(--success-color)' }}>{fmt(pomodoroTime)}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>
                {pomodoroMode === 'work' ? '🎯 Work Session' : '☕ Break Time'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setPomodoroActive(!pomodoroActive)} style={{ flex: 1 }}>
                {pomodoroActive ? '⏸ Pause' : '▶ Start'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setPomodoroActive(false); setPomodoroMode('work'); setPomodoroTime(pomodoroWorkTime * 60); }}>🔄 Reset</button>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowPomodoroSettings(!showPomodoroSettings)} style={{ width: '100%' }}>
              ⚙️ Settings
            </button>

            {showPomodoroSettings && (
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                <h5 style={{ marginBottom: 12, fontSize: '0.9rem', fontWeight: 700 }}>Customize Timer</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Work (min)</label>
                    <input type="number" value={pomodoroWorkTime} onChange={(e) => setPomodoroWorkTime(parseInt(e.target.value) || 1)} className="form-input" style={{ padding: '4px 8px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>Break (min)</label>
                    <input type="number" value={pomodoroBreakTime} onChange={(e) => setPomodoroBreakTime(parseInt(e.target.value) || 1)} className="form-input" style={{ padding: '4px 8px' }} />
                  </div>
                  <button className="btn btn-success btn-sm" onClick={() => {
                    localStorage.setItem('pomodoroSettings', JSON.stringify({ workTime: pomodoroWorkTime, breakTime: pomodoroBreakTime }));
                    toast.success('Saved!');
                    setShowPomodoroSettings(false);
                    if (!pomodoroActive) setPomodoroTime(pomodoroWorkTime * 60);
                  }}>Save</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Tutor Window */}
        {showAI && !isFullscreen && (
          <div style={{ 
            position: 'fixed', bottom: aiMaximized ? 24 : 100, right: aiMaximized ? 24 : 92, 
            width: aiMaximized ? 'calc(100% - 48px)' : 360, height: aiMaximized ? 'calc(100% - 48px)' : 500, 
            zIndex: 1002, display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease'
          }} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>🤖 AI Assistant</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setAiMaximized(!aiMaximized)}>{aiMaximized ? '🗗' : '🗖'}</button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowAI(false)}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8, padding: '4px' }}>
              {aiChat.map((msg, i) => (
                <div key={i} style={{ 
                  padding: '10px 14px', borderRadius: 14, 
                  background: msg.role === 'user' ? 'var(--accent-light)' : 'var(--bg-tertiary)', 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', 
                  maxWidth: '85%', fontSize: '0.85rem', color: 'var(--text-primary)'
                }} className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ))}
              {aiLoading && <div style={{ alignSelf: 'flex-start', padding: 10, background: 'var(--bg-tertiary)', borderRadius: 10, fontSize: '0.85rem' }}>Thinking...</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" className="form-input" placeholder="Ask anything..." value={aiQuestion} 
                onChange={(e) => setAiQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAsk()} />
              <button className="btn btn-primary" onClick={handleAsk} disabled={aiLoading}>Send</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
