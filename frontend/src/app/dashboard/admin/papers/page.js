'use client';
import { useEffect, useState } from 'react';
import { getPendingPapers, getAllPapers, getCourses, getCoursePapers, approvePaper, rejectPaper } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminPapersPage() {
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [browsePapers, setBrowsePapers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, a, c] = await Promise.all([getPendingPapers(), getAllPapers(), getCourses()]);
      setPending(p); setAll(a); setCourses(c);
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

  const loadBrowsePapers = async (courseId) => {
    setSelectedCourse(courseId);
    try { const data = await getCoursePapers(courseId); setBrowsePapers(data); }
    catch (err) { setBrowsePapers([]); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const papers = tab === 'pending' ? pending : tab === 'all' ? all : [];
  const grouped = browsePapers.reduce((acc, p) => {
    if (!acc[p.examCategory]) acc[p.examCategory] = {};
    if (!acc[p.examCategory][p.year]) acc[p.examCategory][p.year] = [];
    acc[p.examCategory][p.year].push(p);
    return acc;
  }, {});
  const filtered = courses.filter(c => c.courseName.toLowerCase().includes(search.toLowerCase()) || c.courseCode.toLowerCase().includes(search.toLowerCase()));


  return (
    <div className="animate-fade">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>📄 Paper Management</h1>
      <div className="tabs">
        <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Pending ({pending.length})
        </button>
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          All Papers ({all.length})
        </button>
        <button className={`tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>
          Browse Papers
        </button>
      </div>

      {tab !== 'browse' ? (
        // Approval tabs
        papers.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">✅</div><div className="empty-state-title">No papers to show</div></div>
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
                {p.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(() => {
                      const isPdf = p.fileUrl.toLowerCase().endsWith('.pdf') || (p.fileName && p.fileName.toLowerCase().endsWith('.pdf'));
                      const isOffice = p.fileName && p.fileName.toLowerCase().match(/\.(docx|pptx|xlsx)$/);
                      let viewUrl;
                      if (isPdf) {
                        viewUrl = p.fileUrl;
                      } else if (isOffice) {
                        viewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(p.fileUrl)}`;
                      } else {
                        viewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(p.fileUrl)}&embedded=true`;
                      }
                      return (
                        <a href={viewUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">View</a>
                      );
                    })()}
                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(p._id)}>✓ Approve</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(p._id)}>✗ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        // Browse papers tab
        !selectedCourse ? (
          <>
            <input type="text" className="form-input" placeholder="Search courses..." value={search}
              onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 400, marginBottom: 20 }} />
            <div className="grid-3">
              {filtered.map(c => (
                <div key={c._id} className="card card-hover" style={{ cursor: 'pointer' }} onClick={() => loadBrowsePapers(c._id)}>
                  <span className="badge badge-accent">{c.courseCode}</span>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 8 }}>{c.courseName}</h3>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedCourse(null); setBrowsePapers([]); }} style={{ marginBottom: 20 }}>← Back to Courses</button>
            {Object.keys(grouped).length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon">📄</div><div className="empty-state-title">No papers available yet</div></div>
            ) : (
              Object.entries(grouped).sort().map(([category, years]) => (
                <div key={category} style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>📋 {category}</h2>
                  {Object.entries(years).sort((a,b) => b[0]-a[0]).map(([year, yearPapers]) => (
                    <div key={year} style={{ marginBottom: 12 }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{year}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {yearPapers.map(p => (
                          <div key={p._id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.fileName || 'Paper'}</span>
                              {p.description && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>— {p.description}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {(() => {
                                const isPdf = p.fileUrl.toLowerCase().endsWith('.pdf') || p.fileName.toLowerCase().endsWith('.pdf');
                                const isOffice = p.fileName.toLowerCase().match(/\.(docx|pptx|xlsx)$/);
                                
                                let viewUrl;
                                if (isPdf) {
                                  viewUrl = p.fileUrl;
                                } else if (isOffice) {
                                  viewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(p.fileUrl)}`;
                                } else {
                                  viewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(p.fileUrl)}&embedded=true`;
                                }

                                let downloadUrl = p.fileUrl;
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
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </>
        )
      )}
    </div>
  );
}
