'use client';
import { useEffect, useState, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCourse, getTopics, generateQuiz, submitQuiz, getQuizHistory, addComment, getComments, toggleLike, askTutor, getAITutorHistory, deleteComment, completeTopic, getMyEnrolled } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function CourseDetailPage({ params: paramsPromise }) {
  const { user, checkAuth } = useAuth();
  const searchParams = useSearchParams();
  const teacherId = searchParams.get('teacher');
  const [course, setCourse] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizReady, setQuizReady] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1800);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [comments, setComments] = useState({ comments: [], replies: [] });
  const [newComment, setNewComment] = useState('');
  const [completedTopicIds, setCompletedTopicIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const answersRef = useRef({});
  const tabSwitchesRef = useRef(0);
  const fullscreenExitsRef = useRef(0);
  const timeLeftRef = useRef(1800);
  const autoSubmittedRef = useRef(false);
  const autoSubmitFunctionRef = useRef(null);
  const router = useRouter();

  // --- Anti-Cheating Mode Logic ---
  useEffect(() => {
    if (!quizMode) return;

    let lastViolationTime = 0;
    const recordViolation = (type, msg) => {
      // Stop recording violations if submission already triggered
      if (autoSubmittedRef.current) {
        console.log('[QUIZ] Violation ignored - already submitted');
        return;
      }

      const now = Date.now();
      if (now - lastViolationTime < 2000) {
        console.log('[QUIZ] Violation debounced');
        return;
      }
      lastViolationTime = now;

      if (type === 'tab') {
        tabSwitchesRef.current += 1;
        const count = tabSwitchesRef.current;
        setTabSwitches(count);
        console.log(`[QUIZ] Tab switch detected: ${count}/2`);
        
        if (count > 1) {
          // Auto-submit immediately when limit exceeded
          console.log('[QUIZ] Tab switch limit exceeded - triggering auto-submission');
          autoSubmittedRef.current = true;
          toast.error(`⚠️ Tab switch limit exceeded! Auto-submitting...`, { duration: 3000 });
          // Call the latest version of the function from the ref
          if (autoSubmitFunctionRef.current) {
            setTimeout(() => {
              autoSubmitFunctionRef.current();
            }, 100);
          }
        } else {
          // Show warning for first violation
          toast.error(`⚠️ Warning: ${msg} (${count}/2).`, { duration: 4000 });
        }
      } else if (type === 'fullscreen') {
        fullscreenExitsRef.current += 1;
        const count = fullscreenExitsRef.current;
        setFullscreenExits(count);
        console.log(`[QUIZ] Fullscreen exit detected: ${count}/2`);
        
        if (count > 1) {
          // Auto-submit immediately when limit exceeded
          console.log('[QUIZ] Fullscreen exit limit exceeded - triggering auto-submission');
          autoSubmittedRef.current = true;
          toast.error(`⚠️ Fullscreen exit limit exceeded! Auto-submitting...`, { duration: 3000 });
          // Call the latest version of the function from the ref
          if (autoSubmitFunctionRef.current) {
            setTimeout(() => {
              autoSubmitFunctionRef.current();
            }, 100);
          }
        } else {
          // Show warning for first violation
          toast.error(`⚠️ Warning: ${msg} (${count}/2).`, { duration: 4000 });
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) recordViolation('tab', 'Tab switch detected');
    };

    const handleBlur = () => {
      // Focus loss could be switching windows (Alt+Tab)
      if (quizMode) recordViolation('tab', 'Window focus lost');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && quizMode) {
        recordViolation('fullscreen', 'Fullscreen exited');
      }
    };

    const preventCheating = (e) => {
      e.preventDefault();
      toast.error('🚫 Action disabled during quiz');
    };

    const handleKeyDown = (e) => {
      // Block Escape key to prevent exiting fullscreen
      if (e.key === 'Escape') {
        e.preventDefault();
        toast.error('🚫 Cannot exit fullscreen during quiz');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', preventCheating);
    document.addEventListener('copy', preventCheating);
    document.addEventListener('paste', preventCheating);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', preventCheating);
      document.removeEventListener('copy', preventCheating);
      document.removeEventListener('paste', preventCheating);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [quizMode]);

  useEffect(() => {
    if (quizMode && timeLeft > 0) {
      const timer = setInterval(() => {
        timeLeftRef.current -= 1;
        setTimeLeft(timeLeftRef.current);
      }, 1000);
      return () => clearInterval(timer);
    }
    if (quizMode && timeLeft === 0) handleSubmitQuiz();
  }, [quizMode, timeLeft > 0]);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  useEffect(() => { loadData(); }, []);


  const params = use(paramsPromise);
  const courseId = params?.id;

  const loadData = async () => {
    try {
      const [courseData, topicsData, enrollments] = await Promise.all([
        getCourse(courseId), 
        getTopics(courseId, teacherId),
        getMyEnrolled()
      ]);
      setCourse(courseData);
      setTopics(topicsData);
      
      const myEnrollment = enrollments.find(e => 
        (e.courseId?._id || e.courseId).toString() === courseId && 
        (e.teacherId?._id || e.teacherId).toString() === teacherId
      );
      
      if (myEnrollment) {
        setCompletedTopicIds(myEnrollment.completedTopics.map(t => t.topicId));
      }
    } catch (err) { 
      console.error(err);
      toast.error('Failed to load course'); 
    }
    finally { setLoading(false); }
  };

  const handleStartQuiz = async (topic) => {
    setQuizLoading(true);
    try {
      const data = await generateQuiz(topic._id);
      setQuizData(data);
      setSelectedTopic(topic);
      setQuizReady(true); // Show confirmation screen first
      setQuizMode(false);
      setAnswers({});
      answersRef.current = {};
      setCurrentQ(0);
      setTimeLeft(1800);
      timeLeftRef.current = 1800;
      setTabSwitches(0);
      tabSwitchesRef.current = 0;
      setFullscreenExits(0);
      fullscreenExitsRef.current = 0;
      autoSubmittedRef.current = false;
      setQuizResult(null);
    } catch (err) { toast.error(err.message || 'Failed to generate quiz'); }
    finally { setQuizLoading(false); }
  };

  const startQuizFinal = () => {
    autoSubmittedRef.current = false;
    setQuizReady(false);
    setQuizMode(true);
    enterFullscreen();
  };

  // Auto-submit for cheating violations (no validation)
  const autoSubmitDueToViolation = async () => {
    console.log('[QUIZ] Auto-submit triggered due to violation');
    if (!quizData) {
      console.error('[QUIZ] Cannot submit: quizData is null');
      toast.error('Error: Quiz data not found');
      return;
    }
    if (quizLoading) {
      console.warn('[QUIZ] Submission already in progress');
      return;
    }
    
    setQuizLoading(true);
    try {
      console.log('[QUIZ] Submitting quiz with violations...');
      const currentAnswers = answersRef.current;
      const questions = quizData.questions.map((q, i) => ({
        ...q, studentAnswer: currentAnswers[i] || '',
      }));
      const isPractice = completedTopicIds.includes(selectedTopic._id);
      
      console.log(`[QUIZ] Tab switches: ${tabSwitchesRef.current}, Fullscreen exits: ${fullscreenExitsRef.current}`);
      
      const result = await submitQuiz({
        topicId: selectedTopic._id, courseId, teacherId,
        questions, tabSwitches: tabSwitchesRef.current, fullscreenExits: fullscreenExitsRef.current,
        timeTaken: 1800 - timeLeftRef.current, isPractice,
      });
      
      console.log('[QUIZ] Submission successful:', result);
      setQuizResult(result);
      setQuizMode(false);
      exitFullscreen();
      
      if (result.passed && !isPractice) {
        setCompletedTopicIds([...completedTopicIds, selectedTopic._id]);
        checkAuth();
      }
      
      toast.success('Quiz submitted due to suspicious activity', { duration: 3000 });
    } catch (err) { 
      console.error('[QUIZ] Auto-submission failed:', err.message);
      toast.error(`Submission failed: ${err.message}`); 
    } finally { 
      setQuizLoading(false); 
    }
  };

  // Register the auto-submit function in a ref so event listeners always have the latest version
  useEffect(() => {
    autoSubmitFunctionRef.current = autoSubmitDueToViolation;
  }, [autoSubmitDueToViolation, quizData, selectedTopic, courseId, teacherId, completedTopicIds]);

  const handleSubmitQuiz = async () => {
    if (!quizData) return;
    
    // Check if all questions have been answered
    const currentAnswers = answersRef.current;
    const unansweredCount = quizData.questions.filter((_, i) => !currentAnswers[i]).length;
    
    if (unansweredCount > 0) {
      toast.error(`⚠️ Please answer all ${unansweredCount} unanswered question(s) before submitting!`);
      return;
    }
    
    // Prevent duplicate submissions
    if (quizLoading) return;
    
    setQuizLoading(true);
    try {
      const questions = quizData.questions.map((q, i) => ({
        ...q, studentAnswer: currentAnswers[i] || '',
      }));
      const isPractice = completedTopicIds.includes(selectedTopic._id);
      const result = await submitQuiz({
        topicId: selectedTopic._id, courseId, teacherId,
        questions, tabSwitches: tabSwitchesRef.current, fullscreenExits: fullscreenExitsRef.current,
        timeTaken: 1800 - timeLeftRef.current, isPractice,
      });
      setQuizResult(result);
      exitFullscreen();
      if (result.passed && !isPractice) {
        setCompletedTopicIds([...completedTopicIds, selectedTopic._id]);
        checkAuth();
      }
    } catch (err) { toast.error(err.message); }
    finally { setQuizLoading(false); }
  };

  const handleCompleteTopic = async (topic) => {
    setLoading(true);
    try {
      await completeTopic(topic._id);
      setCompletedTopicIds([...completedTopicIds, topic._id]);
      toast.success('Topic marked as complete! 🎉');
      checkAuth();
    } catch (err) {
      toast.error(err.message || 'Failed to mark as complete');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (topicId) => {
    try { const data = await getComments(topicId); setComments(data); }
    catch (err) {}
  };

  const handleComment = async (topicId) => {
    if (!newComment.trim()) return;
    try {
      await addComment(topicId, newComment);
      setNewComment('');
      loadComments(topicId);
    } catch (err) { toast.error('Failed to post comment'); }
  };

  const handleDeleteComment = async (topicId, commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteComment(commentId);
      toast.success('Comment deleted');
      loadComments(topicId);
    } catch (err) { toast.error('Failed to delete comment'); }
  };


  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  // Quiz confirmation screen
  if (quizReady && quizData) {
    return (
      <div className="animate-fade" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div className="card">
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🛡️</div>
          <h2 style={{ marginBottom: 16 }}>Ready to start the Quiz?</h2>
          <div className="card" style={{ background: 'var(--bg-tertiary)', textAlign: 'left', marginBottom: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Rules:</h4>
            <ul style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>The quiz will open in <strong>Fullscreen Mode</strong>.</li>
              <li>Exiting fullscreen more than once will auto-submit the quiz.</li>
              <li>Switching tabs or minimizing the window will be flagged as cheating.</li>
              <li>You have <strong>30 minutes</strong> to complete the quiz.</li>
              <li>Minimum 5/10 score required to pass.</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setQuizReady(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={startQuizFinal}>Start Now (Fullscreen)</button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz mode
  if (quizMode && quizData && !quizResult) {
    const q = quizData.questions[currentQ];
    return (
      <div className="animate-fade" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span className="badge badge-accent">Quiz: {selectedTopic?.topicName}</span>
            <span className="badge badge-warning">⏱️ {fmt(timeLeft)}</span>
            <span className="badge badge-info">Q {currentQ+1}/{quizData.questions.length}</span>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16, fontSize: '1.05rem' }}>{q.question}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => {
                const newAns = {...answers, [currentQ]: opt};
                setAnswers(newAns);
                answersRef.current = newAns;
              }}
                style={{
                  padding: '14px 18px', borderRadius: 12, border: `2px solid ${answers[currentQ] === opt ? 'var(--accent)' : 'var(--border-color)'}`,
                  background: answers[currentQ] === opt ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-main)',
                  fontSize: '0.9rem', fontWeight: answers[currentQ] === opt ? 600 : 400, transition: 'all 0.2s',
                }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button className="btn btn-secondary" disabled={currentQ === 0} onClick={() => setCurrentQ(currentQ - 1)}>← Previous</button>
          {currentQ < quizData.questions.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setCurrentQ(currentQ + 1)}>Next →</button>
          ) : (
            <button className="btn btn-success" onClick={handleSubmitQuiz} disabled={quizLoading}>
              {quizLoading ? 'Submitting...' : '✓ Submit Quiz'}
            </button>
          )}
        </div>
        <div style={{display:'flex', gap: 12, marginTop: 12, flexWrap: 'wrap'}}>
          {tabSwitches > 0 && <div className="badge badge-danger">⚠️ Tab switches: {tabSwitches}/2</div>}
          {fullscreenExits > 0 && <div className="badge badge-danger">🚫 Fullscreen exits: {fullscreenExits}/2</div>}
        </div>
      </div>
    );
  }

  // Quiz result
  if (quizResult) {
    return (
      <div className="animate-fade" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div className="card">
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>{quizResult.passed ? '🎉' : '😔'}</div>
          <h2 style={{ marginBottom: 8 }}>{quizResult.passed ? 'Congratulations!' : 'Keep Trying!'}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            You scored <strong>{quizResult.score}/10</strong> {quizResult.passed ? '- Topic Completed!' : '- Score 5+ to pass'}
          </p>
          {quizResult.xpAwarded > 0 && <div className="badge badge-success" style={{fontSize:'1rem',padding:'8px 20px',marginBottom:16}}>+{quizResult.xpAwarded} XP Earned! 🎯</div>}
          {quizResult.progressUpdate?.newAchievements?.length > 0 && (
            <div style={{marginBottom:16}}>
              {quizResult.progressUpdate.newAchievements.map((a,i) => (
                <div key={i} className="badge badge-accent" style={{margin:4,padding:'8px 16px'}}>{a.icon} {a.name}</div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => { setQuizMode(false); setQuizResult(null); }}>Back to Course</button>
            <button className="btn btn-primary" onClick={() => handleStartQuiz(selectedTopic)}>
              {quizResult.passed ? 'Practice Again' : 'Retry Quiz'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Course view with topics
  const teacher = course?.enrolledTeachers?.find(t => t.teacherId?._id === teacherId);

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.back()} style={{marginBottom:16}}>← Back</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="badge badge-accent" style={{marginBottom:8,display:'inline-block'}}>{course?.courseCode}</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{course?.courseName}</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>👨‍🏫 {teacher?.teacherId?.name}</p>
          </div>
        </div>
      </div>

      {/* Syllabus */}
      {teacher?.syllabusUrl && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 8 }}>📋 Syllabus</h3>
          <a href={teacher.syllabusUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
            {teacher.syllabusType === 'file' ? '📥 Download Syllabus' : '🔗 View Syllabus'}
          </a>
        </div>
      )}

      {/* Topics list */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>📖 Topics</h2>
      {topics.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">No topics yet</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {topics.map((topic, idx) => {
            const isCompleted = completedTopicIds.includes(topic._id);
            const isExpanded = selectedTopic?._id === topic._id;
            return (
              <div key={topic._id} className="card" style={{ borderColor: isCompleted ? 'var(--success)' : isExpanded ? 'var(--accent)' : '' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => { setSelectedTopic(isExpanded ? null : topic); if (!isExpanded) loadComments(topic._id); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.5rem' }}>{isCompleted ? '✅' : `${idx + 1}️⃣`}</span>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{topic.topicName}</h3>
                      {topic.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{topic.description}</p>}
                    </div>
                  </div>
                  <span style={{ fontSize: '1.2rem' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
                    {/* YouTube Links */}
                    {topic.youtubeLinks?.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ marginBottom: 10 }}>📹 Video Resources</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {topic.youtubeLinks.map((link, i) => (
                            <a key={i} href={link.url} target="_blank" rel="noopener" className="btn btn-secondary btn-sm" style={{justifyContent:'flex-start'}}>
                              ▶️ {link.title || `Video ${i + 1}`}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* PPT / Materials */}
                    {(topic.pptUrl || topic.pptLinks?.length > 0) && (
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ marginBottom: 10 }}>📊 Presentations & Materials</h4>

                        {/* Uploaded file */}
                        {topic.pptUrl && topic.pptType === 'file' && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>📎 {topic.pptName || 'Uploaded File'}</div>
                            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 8 }}>
                              <iframe
                                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(topic.pptUrl)}`}
                                style={{ width: '100%', height: 450, border: 'none' }}
                                title={topic.pptName || 'Presentation'}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <a href={topic.pptUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">📥 Download</a>
                              <a href={`https://docs.google.com/gview?url=${encodeURIComponent(topic.pptUrl)}&embedded=true`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">🔗 Google Viewer</a>
                            </div>
                          </div>
                        )}

                        {/* Multiple Uploaded Files */}
                        {topic.pptFiles?.map((file, idx) => (
                          <div key={`file-${idx}`} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>📎 {file.name || 'Uploaded File'}</div>
                            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 8 }}>
                              <iframe
                                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`}
                                style={{ width: '100%', height: 450, border: 'none' }}
                                title={file.name || 'Presentation'}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <a href={file.url.replace('/upload/', '/upload/fl_attachment/')} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">📥 Download</a>
                              <a href={`https://docs.google.com/gview?url=${encodeURIComponent(file.url)}&embedded=true`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">🔗 Google Viewer</a>
                            </div>
                          </div>
                        ))}
                        {topic.pptLinks?.map((link, li) => {
                          const isGoogleDrive = link.url.includes('drive.google.com') || link.url.includes('docs.google.com');
                          const embedUrl = isGoogleDrive
                            ? link.url.replace('/view', '/preview').replace('/edit', '/preview').replace('/pub', '/embed')
                            : `https://docs.google.com/gview?url=${encodeURIComponent(link.url)}&embedded=true`;
                          return (
                            <div key={li} style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>🔗 {link.title}</div>
                              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 8 }}>
                                <iframe src={embedUrl} style={{ width: '100%', height: 450, border: 'none' }} title={link.title} />
                              </div>
                              <a href={link.url} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">🔗 Open Original</a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Code Template */}
                    {topic.codeTemplate && (
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ marginBottom: 10 }}>💻 Code Template ({topic.codeLanguage})</h4>
                        <pre style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 12, overflow: 'auto', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                          <code>{topic.codeTemplate}</code>
                        </pre>
                        <button className="btn btn-secondary btn-sm" style={{marginTop:8}} onClick={() => { navigator.clipboard.writeText(topic.codeTemplate); toast.success('Copied!'); }}>📋 Copy Code</button>
                      </div>
                    )}
                    {/* Quiz Button / Mark Complete */}
                    <div style={{ marginBottom: 20 }}>
                      {topic.enableQuiz ? (
                        <button className="btn btn-primary" onClick={() => handleStartQuiz(topic)} disabled={quizLoading}>
                          {quizLoading ? 'Generating Quiz...' : isCompleted ? '🔄 Retake Quiz (Practice)' : '✅ Mark Complete & Take Quiz'}
                        </button>
                      ) : (
                        !isCompleted && (
                          <button className="btn btn-primary" onClick={() => handleCompleteTopic(topic)} disabled={loading}>
                            {loading ? 'Processing...' : '✅ Mark as Complete'}
                          </button>
                        )
                      )}
                      {isCompleted && !topic.enableQuiz && (
                        <div className="badge badge-success" style={{padding:'8px 16px'}}>Topic Completed! ✅</div>
                      )}
                    </div>
                    {/* Comments */}
                    <div>
                      <h4 style={{ marginBottom: 10 }}>💬 Comments</h4>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <input type="text" className="form-input" placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                        <button className="btn btn-primary btn-sm" onClick={() => handleComment(topic._id)}>Post</button>
                      </div>
                      {comments.comments?.map(c => (
                        <div key={c._id} style={{ padding: 12, borderRadius: 10, background: 'var(--bg-tertiary)', marginBottom: 8, border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>👤 {c.userName}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p style={{ marginTop: 4, fontSize: '0.9rem' }}>{c.content}</p>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                              onClick={() => toggleLike(c._id).then(() => loadComments(topic._id))}>
                              ❤️ {c.likes?.length || 0}
                            </button>
                            {(user.role === 'admin' || user._id === c.userId) && (
                              <button style={{ background: 'none', border: 'none', color: 'var(--error, #ef4444)', cursor: 'pointer', fontSize: '0.8rem' }}
                                onClick={() => handleDeleteComment(topic._id, c._id)}>
                                🗑 Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
