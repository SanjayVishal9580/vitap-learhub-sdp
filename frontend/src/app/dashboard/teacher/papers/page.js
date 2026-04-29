'use client';
import { useEffect, useState, useRef } from 'react';
import { getMyEnrolled, getCoursePapers, uploadPaper } from '@/lib/api';
import toast from 'react-hot-toast';

export default function TeacherPapersPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ year: new Date().getFullYear(), examCategory: 'CAT-1', description: '' });
  const fileRef = useRef(null);

  useEffect(() => { getMyEnrolled().then(setCourses).catch(console.error).finally(() => setLoading(false)); }, []);

  const loadPapers = async (courseId) => {
    setSelectedCourse(courseId);
    try { const data = await getCoursePapers(courseId); setPapers(data); }
    catch (err) { setPapers([]); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file || !selectedCourse) return toast.error('Please select a file');
    
    setUploading(true);
    const formData = new FormData();
    formData.append('courseId', selectedCourse);
    formData.append('year', form.year);
    formData.append('examCategory', form.examCategory);
    formData.append('description', form.description);
    formData.append('paper', file);

    try {
      await uploadPaper(formData);
      toast.success('Paper uploaded and pending admin approval');
      setShowUpload(false);
      loadPapers(selectedCourse);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const grouped = papers.reduce((acc, p) => {
    if (!acc[p.examCategory]) acc[p.examCategory] = {};
    if (!acc[p.examCategory][p.year]) acc[p.examCategory][p.year] = [];
    acc[p.examCategory][p.year].push(p);
    return acc;
  }, {});

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const filtered = courses.filter(c => c.courseName.toLowerCase().includes(search.toLowerCase()) || c.courseCode.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>📄 Manage Past Papers</h1>

      {!selectedCourse ? (
        <>
          <input type="text" className="form-input" placeholder="Search your courses..." value={search}
            onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 400, marginBottom: 20 }} />
          <div className="grid-3">
            {filtered.map(c => (
              <div key={c._id} className="card card-hover" style={{ cursor: 'pointer' }} onClick={() => loadPapers(c._id)}>
                <span className="badge badge-accent">{c.courseCode}</span>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 8 }}>{c.courseName}</h3>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedCourse(null); setPapers([]); }}>← Back to Courses</button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>+ Upload Paper</button>
          </div>
          
          {Object.keys(grouped).length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📄</div><div className="empty-state-title">No papers available for this course</div></div>
          ) : (
            Object.entries(grouped).sort().map(([category, years]) => (
              <div key={category} style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>📋 {category}</h2>
                {Object.entries(years).sort((a,b) => b[0]-a[0]).map(([year, yearPapers]) => (
                  <div key={year} style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{year}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {yearPapers.map(p => (
                        <div key={p._id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.fileName || 'Paper'}</span>
                              <span className={`badge ${p.status === 'approved' ? 'badge-success' : p.status === 'rejected' ? 'badge-danger' : 'badge-info'}`} style={{fontSize: '0.7rem'}}>{p.status}</span>
                            </div>
                            {p.description && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.description}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {(() => {
                              const FileUrl = p.fileUrl || '';
                              const FileName = p.fileName || '';
                              const isPdf = FileUrl.toLowerCase().endsWith('.pdf') || FileName.toLowerCase().endsWith('.pdf');
                              const isOffice = FileName.toLowerCase().match(/\.(docx|pptx|xlsx)$/);
                              
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
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Upload Past Paper</h3>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label className="form-label">Exam Category</label>
                <select className="form-input" value={form.examCategory} onChange={e => setForm({...form, examCategory: e.target.value})}>
                  <option value="CAT-1">CAT-1</option>
                  <option value="CAT-2">CAT-2</option>
                  <option value="FAT">FAT</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <input type="number" className="form-input" value={form.year} onChange={e => setForm({...form, year: e.target.value})} min="2000" max="2100" />
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Set A, Solution included" />
              </div>
              <div className="form-group">
                <label className="form-label">File (PDF/DOC)</label>
                <input type="file" ref={fileRef} className="form-input" accept=".pdf,.doc,.docx" required />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => !uploading && setShowUpload(false)} disabled={uploading}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
