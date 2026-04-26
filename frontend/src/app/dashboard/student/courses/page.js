'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCourses, enrollStudent } from '@/lib/api';
import toast from 'react-hot-toast';

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState('');
  const [expandedCourses, setExpandedCourses] = useState({});
  const router = useRouter();

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try { const data = await getCourses(); setCourses(data); }
    catch (err) { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  };

  const handleEnroll = async (courseId, teacherId) => {
    setEnrolling(`${courseId}-${teacherId}`);
    try {
      await enrollStudent(courseId, teacherId);
      toast.success('Enrolled successfully!');
      router.push(`/dashboard/student/courses/${courseId}?teacher=${teacherId}`);
    } catch (err) { toast.error(err.message); }
    finally { setEnrolling(''); }
  };

  const toggleExpand = (courseId) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const filtered = courses.filter(c =>
    c.courseName.toLowerCase().includes(search.toLowerCase()) ||
    c.courseCode.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>📚 Browse Courses</h1>
        <input type="text" className="form-input" placeholder="Search courses..." value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      </div>

      <div className="grid-2">
        {filtered.map((course) => (
          <div key={course._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="badge badge-accent">{course.courseCode}</span>
              <span className="badge badge-info">{course.enrolledTeachers?.length || 0} Teachers</span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16 }}>{course.courseName}</h3>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                onClick={() => toggleExpand(course._id)}
              >
                {expandedCourses[course._id] ? 'Hide Teachers ▲' : `View ${course.enrolledTeachers?.length || 0} Teachers ▼`}
              </button>
            </div>

            {expandedCourses[course._id] && (
              <div className="animate-fade-in" style={{ marginTop: 16 }}>
                {course.enrolledTeachers?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {course.enrolledTeachers.map((t) => (
                      <div key={t.teacherId?._id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: 12, borderRadius: 10, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>👨‍🏫 {t.teacherId?.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.studentCount || 0} students</div>
                        </div>
                        <button className="btn btn-primary btn-sm"
                          disabled={enrolling === `${course._id}-${t.teacherId?._id}`}
                          onClick={() => handleEnroll(course._id, t.teacherId?._id)}>
                          {enrolling === `${course._id}-${t.teacherId?._id}` ? '...' : 'Study with →'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No teachers enrolled yet</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No courses found</div>
          <p>Try a different search term</p>
        </div>
      )}
    </div>
  );
}
