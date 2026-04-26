'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signup as signupApi } from '@/lib/api';
import toast from 'react-hot-toast';
import styles from '../login/auth.module.css';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { loginUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const data = await signupApi(name, email, password, role);
      if (role === 'teacher') {
        toast.success(data.message || 'Account created! Please wait for 24 hours for admin approval.', { duration: 6000 });
        router.push('/login');
      } else {
        toast.success('Account created successfully!');
        loginUser(data.token, data.user);
      }
    } catch (err) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.bgOrbs}>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
      </div>
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <span className={styles.authLogo} onClick={() => router.push('/')}>🎓</span>
            <h1 className={styles.authTitle}>Create Account</h1>
            <p className={styles.authSubtitle}>Join VITAP LearnHub today</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" placeholder="John Doe"
                value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="your@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className={styles.passwordWrap}>
                <input type={showPassword ? 'text' : 'password'} className="form-input"
                  placeholder="Min 6 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className={styles.passwordWrap}>
                <input type={showPassword ? 'text' : 'password'} className="form-input"
                  placeholder="Repeat your password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">I am a</label>
              <div className={styles.roleSelect}>
                {['student', 'teacher'].map(r => (
                  <button key={r} type="button"
                    className={`${styles.roleBtn} ${role === r ? styles.roleBtnActive : ''}`}
                    onClick={() => setRole(r)}>
                    {r === 'student' ? '🎒' : '👨‍🏫'} {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className={`btn btn-primary ${styles.authBtn}`} disabled={loading}>
              {loading ? <span className="spinner" style={{width:20,height:20,borderWidth:2}}></span> : 'Create Account'}
            </button>
          </form>
          <div className={styles.authFooter}>
            <p>Already have an account? <span className={styles.authLink} onClick={() => router.push('/login')}>Sign In</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
