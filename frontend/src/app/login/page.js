'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { login as loginApi } from '@/lib/api';
import toast from 'react-hot-toast';
import styles from './auth.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { loginUser } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      toast.success(`Welcome back, ${data.user.name}!`);
      loginUser(data.token, data.user);
    } catch (err) {
      toast.error(err.message || 'Login failed');
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
            <h1 className={styles.authTitle}>Welcome Back</h1>
            <p className={styles.authSubtitle}>Sign in to continue learning</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="your@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className={styles.passwordWrap}>
                <input type={showPassword ? 'text' : 'password'} className="form-input"
                  placeholder="Enter your password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" className={`btn btn-primary ${styles.authBtn}`} disabled={loading}>
              {loading ? <span className="spinner" style={{width:20,height:20,borderWidth:2}}></span> : 'Sign In'}
            </button>
          </form>
          <div className={styles.authFooter}>
            <p>Don't have an account? <span className={styles.authLink} onClick={() => router.push('/signup')}>Sign Up</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
