'use client';
import { useEffect, useState } from 'react';
import { getCourses, deleteCourse, updateCourse } from '@/lib/api';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ courseCode: '', courseName: '', description: '', credits: 3, category: 'Core' });
  const [editForm, setEditForm] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (err) { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`WARNING: Deleting "${name}" will also delete ALL topics, comments, and enrollments associated with it. Are you sure?`)) return;
    try {
      await deleteCourse(id);
      toast.success('Course deleted successfully');
      loadData();
    } catch (err) { toast.error(err.message || 'Failed to delete course'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to create');
      
      toast.success('Course created!');
      setShowCreate(false);
      setForm({ courseCode: '', courseName: '', description: '', credits: 3, category: 'Core' });
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateCourse(editForm._id, editForm);
      toast.success('Course updated successfully');
      setShowEdit(false);
      setEditForm(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update course');
    }
  };

  const openEditModal = (course) => {
    setEditForm({
      _id: course._id,
      courseCode: course.courseCode || '',
      courseName: course.courseName || '',
      description: course.description || '',
      credits: course.credits || 3,
      category: course.category || 'Core'
    });
    setShowEdit(true);
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  const filtered = courses.filter(c =>
    c.courseName?.toLowerCase().includes(search.toLowerCase()) || c.courseCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📚 Course Management</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Course</button>
      </div>
      
      <input type="text" className="form-input" placeholder="Search courses..." value={search}
        onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 400, marginBottom: 20 }} />

      <div className="table-container">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Credits</th><th>Category</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c._id}>
                <td style={{ fontWeight: 600 }}>{c.courseCode}</td>
                <td>{c.courseName}</td>
                <td>{c.credits}</td>
                <td><span className="badge badge-info">{c.category}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(c)}>✏️ Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c._id, c.courseName)}>🗑 Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>No courses found</td></tr>}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Create New Course</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input className="form-input" required value={form.courseCode} onChange={e => setForm({...form, courseCode: e.target.value})} placeholder="e.g. CSE101" />
              </div>
              <div className="form-group">
                <label className="form-label">Course Name</label>
                <input className="form-input" required value={form.courseName} onChange={e => setForm({...form, courseName: e.target.value})} placeholder="e.g. Intro to CS" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Credits</label>
                  <input type="number" className="form-input" required value={form.credits} onChange={e => setForm({...form, credits: parseInt(e.target.value)})} min="1" max="10" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option>Core</option>
                    <option>Elective</option>
                    <option>Project</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && editForm && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Edit Course</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input className="form-input" required value={editForm.courseCode} onChange={e => setEditForm({...editForm, courseCode: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Course Name</label>
                <input className="form-input" required value={editForm.courseName} onChange={e => setEditForm({...editForm, courseName: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Credits</label>
                  <input type="number" className="form-input" required value={editForm.credits} onChange={e => setEditForm({...editForm, credits: parseInt(e.target.value)})} min="1" max="10" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                    <option>Core</option>
                    <option>Elective</option>
                    <option>Project</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
