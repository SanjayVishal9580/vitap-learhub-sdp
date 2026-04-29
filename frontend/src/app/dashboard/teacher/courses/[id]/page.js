'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourse, getTopics, createTopic, updateTopic, deleteTopic, uploadSyllabus, getComments, addComment } from '@/lib/api';
import toast from 'react-hot-toast';

export default function TeacherCourseDetailPage({ params: paramsPromise }) {
  const { user } = useAuth();
  const router = useRouter();
  const params = use(paramsPromise);
  const courseId = params?.id;
  const [course, setCourse] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSyllabus, setShowSyllabus] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [comments, setComments] = useState({ comments: [], replies: [] });
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [form, setForm] = useState({
    topicName: '', description: '', youtubeLinks: '', codeTemplate: '',
    codeLanguage: 'javascript', enableQuiz: true, quizContext: '', pptLinks: '', removePpt: false
  });
  const [pptFiles, setPptFiles] = useState([]);
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [syllabusLink, setSyllabusLink] = useState('');
  const [creating, setCreating] = useState(false);

  const emptyForm = {
    topicName: '', description: '', youtubeLinks: '', codeTemplate: '',
    codeLanguage: 'javascript', enableQuiz: true, quizContext: '', pptLinks: '', removePpt: false
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [courseData, topicsData] = await Promise.all([
        getCourse(courseId), getTopics(courseId, user._id)
      ]);
      setCourse(courseData); setTopics(topicsData);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const openEdit = (topic) => {
    const ytLinks = (topic.youtubeLinks || []).map(l => `${l.url} | ${l.title}`).join('\n');
    const pLinks = (topic.pptLinks || []).map(l => `${l.url} | ${l.title}`).join('\n');
    setForm({
      topicName: topic.topicName || '',
      description: topic.description || '',
      youtubeLinks: ytLinks,
      codeTemplate: topic.codeTemplate || '',
      codeLanguage: topic.codeLanguage || 'javascript',
      enableQuiz: topic.enableQuiz !== false,
      quizContext: topic.quizContext || '',
      pptLinks: pLinks,
      removePpt: false,
      existingPptFiles: topic.pptFiles || [],
    });
    setPptFiles([]);
    setEditingTopic(topic);
    setShowCreate(true);
  };

  const openCreate = () => {
    setForm({ ...emptyForm, existingPptFiles: [] });
    setPptFiles([]);
    setEditingTopic(null);
    setShowCreate(true);
  };

  const handleSubmitTopic = async () => {
    if (!form.topicName.trim()) { toast.error('Topic name required'); return; }
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('courseId', courseId);
      formData.append('topicName', form.topicName);
      formData.append('description', form.description);
      formData.append('codeTemplate', form.codeTemplate);
      formData.append('codeLanguage', form.codeLanguage);
      formData.append('enableQuiz', form.enableQuiz);
      formData.append('quizContext', form.quizContext);
      
      // Append new files
      if (pptFiles && pptFiles.length > 0) {
        Array.from(pptFiles).forEach(file => formData.append('ppts', file));
      }
      
      // Append existing files list (if editing)
      if (editingTopic) {
        formData.append('existingPptFiles', JSON.stringify(form.existingPptFiles.map(f => f.url)));
      }

      // Backward compatibility removal of legacy single file
      if (form.removePpt) formData.append('removePpt', 'true');

      const ytLinks = form.youtubeLinks.split('\n').filter(l => l.trim()).map((l, i) => {
        const parts = l.split('|');
        return { title: parts[1]?.trim() || `Video ${i + 1}`, url: parts[0].trim() };
      });
      formData.append('youtubeLinks', JSON.stringify(ytLinks));

      const pLinks = form.pptLinks.split('\n').filter(l => l.trim()).map((l, i) => {
        const parts = l.split('|');
        return { title: parts[1]?.trim() || `PPT ${i + 1}`, url: parts[0].trim() };
      });
      formData.append('pptLinks', JSON.stringify(pLinks));

      if (editingTopic) {
        await updateTopic(editingTopic._id, formData);
        toast.success('Topic updated!');
      } else {
        await createTopic(formData);
        toast.success('Topic created!');
      }
      setShowCreate(false);
      setForm({ ...emptyForm, existingPptFiles: [] });
      setPptFiles([]);
      setEditingTopic(null);
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const handleUploadSyllabus = async () => {
    try {
      const formData = new FormData();
      if (syllabusFile) formData.append('syllabus', syllabusFile);
      else if (syllabusLink) { formData.append('syllabusUrl', syllabusLink); formData.append('syllabusName', 'Syllabus Link'); }
      else { toast.error('Provide file or link'); return; }
      await uploadSyllabus(courseId, formData);
      toast.success('Syllabus uploaded!');
      setShowSyllabus(false); loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (topicId) => {
    if (!confirm('Delete this topic? This cannot be undone.')) return;
    try { await deleteTopic(topicId); toast.success('Deleted'); loadData(); }
    catch (err) { toast.error(err.message); }
  };

  const loadComments = async (topicId) => {
    try { const data = await getComments(topicId); setComments(data); }
    catch (err) { setComments({ comments: [], replies: [] }); }
  };

  const handleComment = async (topicId, parentId) => {
    if (!newComment.trim()) return;
    try {
      await addComment(topicId, newComment, parentId || null);
      setNewComment('');
      setReplyTo(null);
      loadComments(topicId);
      toast.success('Comment posted!');
    } catch (err) { toast.error('Failed to post comment'); }
  };

  const toggleExpand = (topic) => {
    if (expandedTopic?._id === topic._id) {
      setExpandedTopic(null);
    } else {
      setExpandedTopic(topic);
      loadComments(topic._id);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <button className="btn btn-secondary btn-sm" onClick={() => router.back()} style={{ marginBottom: 16 }}>← Back</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="badge badge-accent">{course?.courseCode}</span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 8 }}>{course?.courseName}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/dashboard/teacher/analytics?courseId=${courseId}`)}>📊 View Analytics</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowSyllabus(true)}>📋 Upload Syllabus</button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Create Topic</button>
        </div>
      </div>

      {/* Topics */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>📖 Topics ({topics.length})</h2>
      {topics.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No topics yet</div><p>Create your first topic with content and quiz context</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topics.map((t, i) => {
            const isExpanded = expandedTopic?._id === t._id;
            return (
              <div key={t._id} className="card" style={{ borderColor: isExpanded ? 'var(--accent)' : '' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }} onClick={() => toggleExpand(t)}>
                    <span style={{ fontWeight: 700, color: 'var(--accent)', minWidth: 24 }}>{i + 1}</span>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{t.topicName}</h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {t.pptUrl && <span>📊 PPT</span>}
                        {t.youtubeLinks?.length > 0 && <span>📹 {t.youtubeLinks.length} videos</span>}
                        {t.codeTemplate && <span>💻 Code</span>}
                        {t.enableQuiz && <span>🧠 Quiz</span>}
                        {t.description && <span>• {t.description}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ cursor: 'pointer', fontSize: '1rem' }} onClick={() => toggleExpand(t)}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>✏️ Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t._id)}>Delete</button>
                  </div>
                </div>

                {/* Expanded view — content preview + comments */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                    {/* Content preview */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, marginBottom: 16 }}>
                      {t.pptUrl && (
                        <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>📊 Presentation</div>
                          <a href={t.pptUrl} target="_blank" rel="noopener" style={{ fontSize: '0.8rem', color: 'var(--accent)', wordBreak: 'break-all' }}>
                            {t.pptName || 'View File'}
                          </a>
                        </div>
                      )}
                      {t.youtubeLinks?.map((link, li) => (
                        <div key={li} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>📹 {link.title}</div>
                          <a href={link.url} target="_blank" rel="noopener" style={{ fontSize: '0.8rem', color: 'var(--accent)', wordBreak: 'break-all' }}>
                            {link.url}
                          </a>
                        </div>
                      ))}
                      {t.codeTemplate && (
                        <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>💻 Code ({t.codeLanguage})</div>
                          <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: 100, margin: 0 }}>{t.codeTemplate}</pre>
                        </div>
                      )}
                      {t.enableQuiz && t.quizContext && (
                        <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>🧠 Quiz Context</div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{t.quizContext}</p>
                        </div>
                      )}
                    </div>

                    {/* Comments Section */}
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>
                        💬 Comments ({comments.comments?.length || 0})
                      </h4>

                      {/* Teacher comment input */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <input type="text" className="form-input" value={newComment}
                          placeholder={replyTo ? `Reply to ${replyTo.userName}...` : 'Write a comment as teacher...'}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(t._id, replyTo?._id)} />
                        <button className="btn btn-primary btn-sm" onClick={() => handleComment(t._id, replyTo?._id)}>Post</button>
                        {replyTo && <button className="btn btn-secondary btn-sm" onClick={() => setReplyTo(null)}>✕</button>}
                      </div>

                      {comments.comments?.length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No comments yet on this topic.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {comments.comments.map(c => (
                            <div key={c._id} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>👤 {c.userName}</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <button onClick={() => setReplyTo(c)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>↩ Reply</button>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>❤️ {c.likes?.length || 0}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.9rem' }}>{c.content}</p>
                              {/* Show replies */}
                              {comments.replies?.filter(r => r.parentId === c._id).map(r => (
                                <div key={r._id} style={{ marginTop: 8, marginLeft: 20, padding: 10, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>↳ {r.userName}</span>
                                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem' }}>{r.content}</p>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Topic Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditingTopic(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h3 className="modal-title">{editingTopic ? '✏️ Edit Topic' : '+ Create New Topic'}</h3>
            <div className="form-group"><label className="form-label">Topic Name *</label>
              <input className="form-input" value={form.topicName} onChange={e => setForm({ ...form, topicName: e.target.value })} placeholder="e.g. Arrays & Time Complexity" /></div>
            <div className="form-group"><label className="form-label">Description</label>
              <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" /></div>

            {/* Current PPT File (Legacy Single File) */}
            {editingTopic?.pptUrl && editingTopic?.pptType === 'file' && !form.removePpt && (
              <div className="form-group">
                <label className="form-label">Legacy Uploaded File</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.85rem', flex: 1 }}>📎 {editingTopic.pptName || 'Uploaded File'}</span>
                  <a href={editingTopic.pptUrl} target="_blank" rel="noopener" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>View</a>
                  <button type="button" className="btn btn-danger btn-sm" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => setForm({ ...form, removePpt: true })}>🗑 Remove</button>
                </div>
              </div>
            )}
            {form.removePpt && (
              <div style={{ padding: 8, borderRadius: 8, background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', fontSize: '0.85rem', marginBottom: 12 }}>
                ⚠️ Legacy PPT file will be removed on save. <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setForm({ ...form, removePpt: false })}>Undo</button>
              </div>
            )}

            {/* Current PPT Files (New Array Format) */}
            {form.existingPptFiles && form.existingPptFiles.length > 0 && (
              <div className="form-group">
                <label className="form-label">Current Uploaded Files</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.existingPptFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.85rem', flex: 1 }}>📎 {file.name || 'Uploaded File'}</span>
                      <a href={file.url} target="_blank" rel="noopener" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>View</a>
                      <button type="button" className="btn btn-danger btn-sm" style={{ fontSize: '0.75rem', padding: '2px 8px' }} 
                        onClick={() => {
                          setForm({ ...form, existingPptFiles: form.existingPptFiles.filter(f => f.url !== file.url) });
                        }}>🗑 Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group"><label className="form-label">Upload New PPT Files</label>
              <input type="file" multiple className="form-input" accept=".pptx,.pdf,.ppt,.doc,.docx" onChange={e => setPptFiles(e.target.files)} /></div>
            <div className="form-group"><label className="form-label">PPT Links (one per line, format: url | title)</label>
              <textarea className="form-textarea" value={form.pptLinks} onChange={e => setForm({ ...form, pptLinks: e.target.value })} placeholder={"https://docs.google.com/... | Lecture 1 PPT\nhttps://drive.google.com/... | Lecture 2 Slides"} rows={3}></textarea></div>
            <div className="form-group"><label className="form-label">YouTube Links (one per line, format: url | title)</label>
              <textarea className="form-textarea" value={form.youtubeLinks} onChange={e => setForm({ ...form, youtubeLinks: e.target.value })} placeholder="https://youtube.com/... | Video Title" rows={3}></textarea></div>
            <div className="form-group"><label className="form-label">Code Template</label>
              <textarea className="form-textarea" value={form.codeTemplate} onChange={e => setForm({ ...form, codeTemplate: e.target.value })} placeholder="function example() {...}" rows={3}></textarea></div>
            <div className="form-group"><label className="form-label">Code Language</label>
              <select className="form-select" value={form.codeLanguage} onChange={e => setForm({ ...form, codeLanguage: e.target.value })}>
                {['javascript', 'python', 'java', 'c', 'cpp', 'html', 'css'].map(l => <option key={l} value={l}>{l}</option>)}
              </select></div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.enableQuiz} onChange={e => setForm({ ...form, enableQuiz: e.target.checked })} id="enableQuiz" />
              <label htmlFor="enableQuiz" style={{ fontWeight: 600 }}>Enable Quiz Generation</label>
            </div>
            {form.enableQuiz && (
              <div className="form-group"><label className="form-label">Quiz Context (defines what OpenRouter AI quizzes about) *</label>
                <textarea className="form-textarea" value={form.quizContext} onChange={e => setForm({ ...form, quizContext: e.target.value })} placeholder="e.g. Arrays - linear search, binary search, time complexity O(n) vs O(log n)" rows={3}></textarea></div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSubmitTopic} disabled={creating}>
                {creating ? 'Saving...' : editingTopic ? '💾 Save Changes' : 'Create Topic'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowCreate(false); setEditingTopic(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Syllabus Modal */}
      {showSyllabus && (
        <div className="modal-overlay" onClick={() => setShowSyllabus(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Upload Syllabus</h3>
            <div className="form-group"><label className="form-label">Upload File (PDF/DOCX)</label>
              <input type="file" className="form-input" accept=".pdf,.docx,.doc" onChange={e => setSyllabusFile(e.target.files[0])} /></div>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '12px 0' }}>— OR —</p>
            <div className="form-group"><label className="form-label">Provide Link</label>
              <input className="form-input" value={syllabusLink} onChange={e => setSyllabusLink(e.target.value)} placeholder="https://drive.google.com/..." /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleUploadSyllabus}>Upload</button>
              <button className="btn btn-secondary" onClick={() => setShowSyllabus(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
