'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateProfile } from '@/lib/api';
import toast from 'react-hot-toast';
import styles from './profile.module.css';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const [selectedAvatar, setSelectedAvatar] = useState('');

  const PRESET_AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Toby',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoey',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bear',
  ];

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name });
      setSelectedAvatar(user.avatar || PRESET_AVATARS[0]);
    }
  }, [user]);

  if (!user) {
    return <div className="loading-page"><div className="spinner"></div></div>;
  }


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateProfile({
        name: formData.name,
        avatar: selectedAvatar
      });
      setUser(result.user);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade" style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 32 }}>👤 My Profile</h1>

      <form onSubmit={handleSubmit}>
        {/* Avatar Selection Section */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Choose Your Avatar</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.9rem' }}>Select an avatar that represents you on LearnHub.</p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: 16, 
            padding: 12,
            background: 'var(--bg-tertiary)',
            borderRadius: 16
          }}>
            {PRESET_AVATARS.map((url, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedAvatar(url)}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 16,
                  cursor: 'pointer',
                  border: `3px solid ${selectedAvatar === url ? 'var(--accent)' : 'transparent'}`,
                  background: 'var(--bg-secondary)',
                  transition: 'all 0.2s ease',
                  padding: 4,
                  boxShadow: selectedAvatar === url ? 'var(--shadow-glow)' : 'none',
                  transform: selectedAvatar === url ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <img src={url} alt={`Avatar ${i}`} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Profile Information */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Account Information</h3>
          
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              minLength="2"
              maxLength="100"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email (Read-only)</label>
            <input
              type="email"
              className="form-input"
              value={user.email}
              disabled
              style={{ cursor: 'not-allowed', opacity: 0.6 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <input
              type="text"
              className="form-input"
              value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              disabled
              style={{ cursor: 'not-allowed', opacity: 0.6 }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-color)' }}>{user.xp || 0}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>Total XP</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success-color)' }}>Lvl {user.level || 1}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>Level</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning-color)' }}>{user.streak || 0} 🔥</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>Day Streak</div>
          </div>
        </div>

        {/* Achievements */}
        {user.achievements && user.achievements.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>🏅 Achievements ({user.achievements.length})</h3>
            <div className="grid-4">
              {user.achievements.map((a, i) => (
                <div key={i} style={{ textAlign: 'center', padding: 12, borderRadius: 10, background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>{a.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{a.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '💾 Saving...' : '💾 Save Changes'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            ← Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
