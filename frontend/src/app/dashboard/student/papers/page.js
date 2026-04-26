'use client';
import { useEffect, useState } from 'react';
import { getCourses, getCoursePapers } from '@/lib/api';

export default function StudentPapersPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { getCourses().then(setCourses).catch(console.error).finally(() => setLoading(false)); }, []);

  const loadPapers = async (courseId) => {
    setSelectedCourse(courseId);
    try { const data = await getCoursePapers(courseId); setPapers(data); }
    catch (err) { setPapers([]); }
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
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>📄 Previous Year Papers</h1>

      {!selectedCourse ? (
        <>
          <input type="text" className="form-input" placeholder="Search courses..." value={search}
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
          <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedCourse(null); setPapers([]); }} style={{ marginBottom: 20 }}>← Back to Courses</button>
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
                                viewUrl = p.fileUrl; // Browsers handle PDFs natively
                              } else if (isOffice) {
                                viewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(p.fileUrl)}`;
                              } else {
                                viewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(p.fileUrl)}&embedded=true`;
                              }

                              // Try to fix cloudinary download url
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
      )}
    </div>
  );
}
