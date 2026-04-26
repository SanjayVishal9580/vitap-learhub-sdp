'use client';
import { useEffect, useState } from 'react';
import { getAdminUsersList, updateUserRole, deleteUser, approveTeacher } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await getAdminUsersList();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    try {
      await updateUserRole(id, newRole);
      toast.success('User role updated!');
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update user role');
    }
  };
  const handleApprove = async (id, status) => {
    try {
      await approveTeacher(id, status);
      toast.success(`Teacher ${status}`);
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    try {
      await deleteUser(id);
      toast.success('User deleted');
      loadUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const filtered = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>👥 User Management</h1>
      </div>

      <input type="text" className="form-input" placeholder="Search by name or email..." value={search}
        onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 400, marginBottom: 20 }} />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u._id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  {u.role === 'teacher' ? (
                    <span className={`badge ${
                      u.approvalStatus === 'approved' ? 'badge-success' : 
                      u.approvalStatus === 'rejected' ? 'badge-danger' : 
                      'badge-warning'
                    }`}>
                      {u.approvalStatus}
                    </span>
                  ) : (
                    <span className="badge badge-success">active</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'teacher' ? 'badge-success' : 'badge-info'}`} style={{ minWidth: 80, textAlign: 'center' }}>
                      {u.role}
                    </span>
                    <select 
                      className="form-input" 
                      style={{ padding: '4px 8px', width: 'auto', fontSize: '0.8rem' }}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    >
                      <option value="student">Set Student</option>
                      <option value="teacher">Set Teacher</option>
                      <option value="admin">Set Admin</option>
                    </select>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {u.role === 'teacher' && u.approvalStatus === 'pending' && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => handleApprove(u._id, 'approved')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleApprove(u._id, 'rejected')}>Reject</button>
                      </>
                    )}
                    {u.role === 'teacher' && u.approvalStatus !== 'pending' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleApprove(u._id, 'pending')}>Reset Status</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u._id, u.name)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
