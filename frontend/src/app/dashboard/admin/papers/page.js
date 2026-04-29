'use client';
import { useEffect, useState } from 'react';
import { getPendingPapers, getAllPapers, approvePaper, rejectPaper } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminPapersPage() {
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, a] = await Promise.all([getPendingPapers(), getAllPapers()]);
      setPending(p); setAll(a);
    } catch (err) {} finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    try { await approvePaper(id); toast.success('Paper approved!'); loadData(); }
    catch (err) { toast.error(err.message); }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason (optional):');
    try { await rejectPaper(id, reason || ''); toast.success('Paper rejected'); loadData(); }
    catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const papers = tab === 'pending' ? pending : all;

  return (
    <div className="animate-fade">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>📄 Paper Approvals</h1>
      <div className="tabs">
        <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Pending ({pending.length})
        </button>
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          All Papers ({all.length})
        </button>
      </div>

      {papers.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-title">No pending papers</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {papers.map(p => (
            <div key={p._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <span className="badge badge-accent">{p.courseId?.courseCode}</span>
                  <span className="badge badge-info">{p.examCategory} - {p.year}</span>
                  <span className={`badge ${p.status === 'approved' ? 'badge-success' : p.status === 'rejected' ? 'badge-danger' : p.status === 'duplicate' ? 'badge-warning' : 'badge-info'}`}>{p.status}</span>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{p.fileName || 'Paper'}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>by {p.uploadedBy?.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(() => {
                  const FileUrl = p.fileUrl || '';
                  const FileName = p.fileName || '';
                  const isPdf = FileUrl.toLowerCase().endsWith('.pdf') || (FileName && FileName.toLowerCase().endsWith('.pdf'));
                  const isOffice = FileName && FileName.toLowerCase().match(/\.(docx|pptx|xlsx)$/);
                  let viewUrl;
                  if (isPdf) {
                    viewUrl = FileUrl;
                  } else if (isOffice) {
                    viewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(FileUrl)}`;
                  } else {
                    viewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(FileUrl)}&embedded=true`;
                  }

                  let downloadUrl = FileUrl;
                  if (downloadUrl.includes('/upload/')) {
                    downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
                  }

                  return (
                    <>
                      <a href={viewUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">View</a>
                      <a href={downloadUrl} download className="btn btn-primary btn-sm">Download</a>
                    </>
                  );
                })()}
                {p.status === 'pending' && (
                  <>
                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(p._id)}>✓ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(p._id)}>✗ Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
