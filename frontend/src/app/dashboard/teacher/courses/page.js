'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCourses, getMyEnrolled, enrollTeacher } from '@/lib/api';
import toast from 'react-hot-toast';

export default function TeacherCoursesPage() {
  const [allCourses, setAllCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [tab, setTab] = useState('my');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [all, my] = await Promise.all([getCourses(), getMyEnrolled()]);
      setAllCourses(all); setMyCourses(my);
    } catch (err) {} finally { setLoading(false); }
  };

  const handleEnroll = async (courseId) => {
    try { await enrollTeacher(courseId); toast.success('Enrolled!'); loadData(); }
    catch (err) { toast.error(err.message); }
  };

  const myIds = myCourses.map(c => c._id);
  const filtered = (tab === 'my' ? myCourses : allCourses).filter(c =>
    c.courseName.toLowerCase().includes(search.toLowerCase()) || c.courseCode.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>📚 Courses</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>My Courses ({myCourses.length})</button>
          <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>Browse All</button>
        </div>
        <input type="text" className="form-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 300, marginLeft: 'auto' }} />
      </div>

      <div className="grid-3">
        {filtered.map(c => (
          <div key={c._id} className="card card-hover">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="badge badge-accent">{c.courseCode}</span>
              {myIds.includes(c._id) && <span className="badge badge-success">Enrolled</span>}
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>{c.courseName}</h3>
            {myIds.includes(c._id) ? (
              <button className="btn btn-primary btn-sm" onClick={() => router.push(`/dashboard/teacher/courses/${c._id}`)}>Manage →</button>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => handleEnroll(c._id)}>Enroll as Teacher</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
