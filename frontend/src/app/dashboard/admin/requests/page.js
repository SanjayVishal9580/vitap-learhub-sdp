'use client';
import { useEffect, useState } from 'react';
import { getCourseRequests, updateCourseRequest } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminCourseRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const data = await getCourseRequests();
      setRequests(data);
    } catch (err) {
      toast.error('Failed to load course requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    let feedback = '';
    if (status === 'rejected') {
      feedback = prompt('Please provide a reason for rejection (optional):');
      if (feedback === null) return; // Cancelled
    }

    try {
      await updateCourseRequest(id, status, feedback);
      toast.success(`Course request ${status}!`);
      loadRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to update request status');
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📥 Course Requests</h1>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Requested By</th>
              <th>Course Details</th>
              <th>Category / Credits</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req._id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{req.requestedBy?.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{req.requestedBy?.email}</div>
                  <div style={{ fontSize: '0.75rem', marginTop: 4 }}><span className="badge badge-info">{req.requestedBy?.role}</span></div>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{req.courseCode}</div>
                  <div>{req.courseName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.description}>
                    {req.description}
                  </div>
                </td>
                <td>
                  <div>{req.category}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{req.credits} Credits</div>
                </td>
                <td>
                  <span className={`badge ${req.status === 'approved' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                    {req.status}
                  </span>
                  {req.adminFeedback && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Reason: {req.adminFeedback}
                    </div>
                  )}
                </td>
                <td>
                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(req._id, 'approved')}>Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleUpdateStatus(req._id, 'rejected')}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>No pending course requests</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
