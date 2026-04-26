'use client';
import { useEffect, useState } from 'react';
import { getLeaderboard } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState({ leaders: [], userRank: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>🏆 Leaderboard</h1>
      <div className="card" style={{ marginBottom: 24, background: 'var(--accent-light)', borderColor: 'var(--accent)' }}>
        <p style={{ fontSize: '0.9rem' }}>Your Rank: <strong>#{data.userRank}</strong> | XP: <strong>{user?.xp || 0}</strong> | Level: <strong>{user?.level || 1}</strong></p>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Rank</th><th>Student</th><th>XP</th><th>Level</th><th>Streak</th><th>Topics</th></tr>
          </thead>
          <tbody>
            {data.leaders.map((s, i) => (
              <tr key={s._id} style={{ background: s._id === user?._id ? 'var(--accent-light)' : '' }}>
                <td><strong>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</strong></td>
                <td style={{ fontWeight: 600 }}>{s.name} {s._id === user?._id && '(You)'}</td>
                <td><span className="badge badge-accent">{s.xp} XP</span></td>
                <td>Lvl {s.level}</td>
                <td>{s.streak} 🔥</td>
                <td>{s.topicsCompleted || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
