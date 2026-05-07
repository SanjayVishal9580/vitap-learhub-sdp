'use client';
import { useEffect, useState } from 'react';
import { getCourses, getCourseTopics, updateTopic, deleteTopic } from '@/lib/api';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AdminTopicsPage() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingTopic, setEditingTopic] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    topicName: '',
    description: '',
    pptLinks: [],
    youtubeLinks: [],
    pptFiles: [],
  });
  const [newLink, setNewLink] = useState({ type: 'ppt', title: '', url: '' });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async (courseId) => {
    setLoading(true);
    try {
      const data = await getCourseTopics(courseId);
      setTopics(data);
      setSelectedCourse(courseId);
    } catch (err) {
      toast.error('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (topic) => {
    setEditingTopic(topic);
    setFormData({
      topicName: topic.topicName,
      description: topic.description || '',
      pptLinks: topic.pptLinks || [],
      youtubeLinks: topic.youtubeLinks || [],
      pptFiles: topic.pptFiles || [],
    });
    setShowEditModal(true);
  };

  const handleDelete = async (topicId, topicName) => {
    if (!confirm(`Delete topic "${topicName}"? This cannot be undone.`)) return;
    try {
      await deleteTopic(topicId);
      toast.success('Topic deleted successfully');
      loadTopics(selectedCourse);
    } catch (err) {
      toast.error(err.message || 'Failed to delete topic');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!formData.topicName.trim()) {
      toast.error('Topic name is required');
      return;
    }

    try {
      const formDataObj = new FormData();
      formDataObj.append('topicName', formData.topicName);
      formDataObj.append('description', formData.description);
      formDataObj.append('pptLinks', JSON.stringify(formData.pptLinks));
      formDataObj.append('youtubeLinks', JSON.stringify(formData.youtubeLinks));
      formDataObj.append('existingPptFiles', JSON.stringify(formData.pptFiles.map(f => f.url)));

      await updateTopic(editingTopic._id, formDataObj);
      toast.success('Topic updated successfully');
      setShowEditModal(false);
      loadTopics(selectedCourse);
    } catch (err) {
      toast.error(err.message || 'Failed to update topic');
    }
  };

  const addLink = () => {
    if (!newLink.title || !newLink.url) {
      toast.error('Please fill in title and URL');
      return;
    }
    if (newLink.type === 'ppt') {
      setFormData({
        ...formData,
        pptLinks: [...formData.pptLinks, { title: newLink.title, url: newLink.url }],
      });
    } else {
      setFormData({
        ...formData,
        youtubeLinks: [...formData.youtubeLinks, { title: newLink.title, url: newLink.url }],
      });
    }
    setNewLink({ type: 'ppt', title: '', url: '' });
  };

  const removeLink = (type, index) => {
    if (type === 'ppt') {
      setFormData({
        ...formData,
        pptLinks: formData.pptLinks.filter((_, i) => i !== index),
      });
    } else {
      setFormData({
        ...formData,
        youtubeLinks: formData.youtubeLinks.filter((_, i) => i !== index),
      });
    }
  };

  const removePptFile = (index) => {
    setFormData({
      ...formData,
      pptFiles: formData.pptFiles.filter((_, i) => i !== index),
    });
  };

  if (loading && !selectedCourse) return <div className="loading-page"><div className="spinner"></div></div>;

  const filteredTopics = topics.filter(t =>
    t.topicName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>📚 Course Topics Management</h1>
        
        {!selectedCourse ? (
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Select a course to view and manage its topics:</p>
            <div className="grid-3">
              {courses.map(c => (
                <div
                  key={c._id}
                  className="card card-hover"
                  style={{ cursor: 'pointer' }}
                  onClick={() => loadTopics(c._id)}
                >
                  <span className="badge badge-accent">{c.courseCode}</span>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 8 }}>{c.courseName}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Click to manage topics →</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedCourse(null);
                    setTopics([]);
                    setSearch('');
                  }}
                  style={{ marginRight: 12 }}
                >
                  ← Back to Courses
                </button>
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  {courses.find(c => c._id === selectedCourse)?.courseName}
                </span>
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="Search topics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 300 }}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner"></div>
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <div className="empty-state-title">No topics found</div>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Topic Name</th>
                      <th>Teacher</th>
                      <th>Description</th>
                      <th>Links</th>
                      <th>PPT Files</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopics.map(topic => (
                      <tr key={topic._id}>
                        <td>
                          <strong>{topic.topicName}</strong>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{topic.teacherId?.name || 'Unknown'}</td>
                        <td style={{ fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {topic.description || '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.85rem', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4 }}>
                            {(topic.pptLinks?.length || 0) + (topic.youtubeLinks?.length || 0)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.85rem', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4 }}>
                            {topic.pptFiles?.length || 0}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleEdit(topic)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', marginRight: 8 }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(topic._id, topic.topicName)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingTopic && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
          backdropFilter: 'blur(4px)',
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 16,
            padding: 32,
            maxWidth: 700,
            width: '100%',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Edit Topic</h2>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Topic Name */}
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>Topic Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.topicName}
                  onChange={(e) => setFormData({ ...formData, topicName: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6, display: 'block' }}>Description</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: 100, fontFamily: 'inherit' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter topic description..."
                />
              </div>

              {/* PPT & YouTube Links */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--bg-secondary)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>🔗 Add Links</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 12, alignItems: 'end' }}>
                  <select
                    className="form-input"
                    value={newLink.type}
                    onChange={(e) => setNewLink({ ...newLink, type: e.target.value })}
                  >
                    <option value="ppt">📊 PPT Link</option>
                    <option value="youtube">▶️ YouTube</option>
                  </select>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Title"
                    value={newLink.title}
                    onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  />
                  <input
                    type="url"
                    className="form-input"
                    placeholder="URL"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={addLink}
                    style={{ padding: '8px 16px' }}
                  >
                    Add
                  </button>
                </div>

                {/* Existing PPT Links */}
                {formData.pptLinks.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>📊 PPT Links:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {formData.pptLinks.map((link, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{link.title}</div>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>
                              {link.url.substring(0, 40)}...
                            </a>
                          </div>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => removeLink('ppt', idx)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing YouTube Links */}
                {formData.youtubeLinks.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>▶️ YouTube Links:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {formData.youtubeLinks.map((link, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{link.title}</div>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>
                              {link.url.substring(0, 40)}...
                            </a>
                          </div>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => removeLink('youtube', idx)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Uploaded PPT Files */}
              {formData.pptFiles.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--bg-secondary)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>📁 Uploaded PPT Files</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {formData.pptFiles.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>📄 {file.name}</div>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent)', textDecoration: 'none' }}>
                            Download
                          </a>
                        </div>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removePptFile(idx)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
