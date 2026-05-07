const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async (res) => {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('API returned non-JSON:', text.substring(0, 200));
    throw new Error(`Server error (${res.status}). Please check if the backend is running.`);
  }
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

// Auth
export const login = (email, password) =>
  fetch(`${API_URL}/auth/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, password }) }).then(handleResponse);

export const signup = (name, email, password, role) =>
  fetch(`${API_URL}/auth/signup`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name, email, password, role }) }).then(handleResponse);

export const getMe = () =>
  fetch(`${API_URL}/auth/me`, { headers: getHeaders() }).then(handleResponse);

export const updateProfile = (data) => {
  const isFormData = data instanceof FormData;
  const headers = isFormData ? getAuthHeaders() : getHeaders();
  const body = isFormData ? data : JSON.stringify(data);
  return fetch(`${API_URL}/auth/profile`, { method: 'PUT', headers, body }).then(handleResponse);
};

export const getAdminUsers = () =>
  fetch(`${API_URL}/auth/users`, { headers: getHeaders() }).then(handleResponse);

export const deleteUser = (id) =>
  fetch(`${API_URL}/auth/users/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse);

// Courses
export const getCourses = () =>
  fetch(`${API_URL}/courses`, { headers: getHeaders() }).then(handleResponse);

export const getCourse = (id) =>
  fetch(`${API_URL}/courses/${id}`, { headers: getHeaders() }).then(handleResponse);

export const getMyEnrolled = () =>
  fetch(`${API_URL}/courses/my/enrolled`, { headers: getHeaders() }).then(handleResponse);

export const enrollTeacher = (courseId) =>
  fetch(`${API_URL}/courses/${courseId}/enroll-teacher`, { method: 'POST', headers: getHeaders() }).then(handleResponse);

export const enrollStudent = (courseId, teacherId) =>
  fetch(`${API_URL}/courses/${courseId}/enroll-student`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ teacherId }) }).then(handleResponse);

export const uploadSyllabus = (courseId, formData) =>
  fetch(`${API_URL}/courses/${courseId}/syllabus`, { method: 'PUT', headers: getAuthHeaders(), body: formData }).then(handleResponse);

export const getCourseStudents = (courseId) =>
  fetch(`${API_URL}/courses/${courseId}/students`, { headers: getHeaders() }).then(handleResponse);

// Topics
export const createTopic = (formData) =>
  fetch(`${API_URL}/topics`, { method: 'POST', headers: getAuthHeaders(), body: formData }).then(handleResponse);

export const getTopics = (courseId, teacherId) =>
  fetch(`${API_URL}/topics/course/${courseId}/teacher/${teacherId}`, { headers: getHeaders() }).then(handleResponse);

export const getCourseTopics = (courseId) =>
  fetch(`${API_URL}/topics/course/${courseId}`, { headers: getHeaders() }).then(handleResponse);

export const getTopic = (id) =>
  fetch(`${API_URL}/topics/${id}`, { headers: getHeaders() }).then(handleResponse);

export const updateTopic = (id, formData) =>
  fetch(`${API_URL}/topics/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: formData }).then(handleResponse);

export const deleteTopic = (id) =>
  fetch(`${API_URL}/topics/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse);

export const completeTopic = (id) =>
  fetch(`${API_URL}/topics/${id}/complete`, { method: 'POST', headers: getHeaders() }).then(handleResponse);

export const deleteCourse = (id) =>
  fetch(`${API_URL}/courses/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse);

// Comments
export const getComments = (topicId) =>
  fetch(`${API_URL}/topics/${topicId}/comments`, { headers: getHeaders() }).then(handleResponse);

export const addComment = (topicId, content, parentId) =>
  fetch(`${API_URL}/topics/${topicId}/comments`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ content, parentId }) }).then(handleResponse);

export const toggleLike = (commentId) =>
  fetch(`${API_URL}/topics/comments/${commentId}/like`, { method: 'PUT', headers: getHeaders() }).then(handleResponse);

export const deleteComment = (commentId) =>
  fetch(`${API_URL}/topics/comments/${commentId}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse);

export const getAdminComments = () =>
  fetch(`${API_URL}/topics/comments/all`, { headers: getHeaders() }).then(handleResponse);

// Quizzes
export const generateQuiz = (topicId) =>
  fetch(`${API_URL}/quizzes/generate`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ topicId }) }).then(handleResponse);

export const submitQuiz = (data) =>
  fetch(`${API_URL}/quizzes/submit`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse);

export const getQuizHistory = (topicId) =>
  fetch(`${API_URL}/quizzes/history/${topicId}`, { headers: getHeaders() }).then(handleResponse);

export const getFlaggedQuizzes = () =>
  fetch(`${API_URL}/quizzes/flagged`, { headers: getHeaders() }).then(handleResponse);

export const invalidateQuiz = (id) =>
  fetch(`${API_URL}/quizzes/${id}/invalidate`, { method: 'PUT', headers: getHeaders() }).then(handleResponse);

// Papers
export const uploadPaper = (formData) =>
  fetch(`${API_URL}/papers`, { method: 'POST', headers: getAuthHeaders(), body: formData }).then(handleResponse);

export const getCoursePapers = (courseId) =>
  fetch(`${API_URL}/papers/course/${courseId}`, { headers: getHeaders() }).then(handleResponse);

export const getPendingPapers = () =>
  fetch(`${API_URL}/papers/pending`, { headers: getHeaders() }).then(handleResponse);

export const getAllPapers = () =>
  fetch(`${API_URL}/papers/all`, { headers: getHeaders() }).then(handleResponse);

export const approvePaper = (id) =>
  fetch(`${API_URL}/papers/${id}/approve`, { method: 'PUT', headers: getHeaders() }).then(handleResponse);

export const rejectPaper = (id, reason) =>
  fetch(`${API_URL}/papers/${id}/reject`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ reason }) }).then(handleResponse);

// Groups
export const createGroup = (data) =>
  fetch(`${API_URL}/groups`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse);

export const joinGroup = (passcode) =>
  fetch(`${API_URL}/groups/join`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ passcode }) }).then(handleResponse);

export const getMyGroups = () =>
  fetch(`${API_URL}/groups/my`, { headers: getHeaders() }).then(handleResponse);

export const getGroupMessages = (groupId) =>
  fetch(`${API_URL}/groups/${groupId}/messages`, { headers: getHeaders() }).then(handleResponse);

export const uploadGroupFile = (groupId, formData) =>
  fetch(`${API_URL}/groups/${groupId}/messages/file`, { method: 'POST', headers: getAuthHeaders(), body: formData }).then(handleResponse);

export const leaveGroup = (groupId) =>
  fetch(`${API_URL}/groups/${groupId}/leave`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse);

// Leaderboard
export const getLeaderboard = () =>
  fetch(`${API_URL}/leaderboard`, { headers: getHeaders() }).then(handleResponse);

// Analytics
export const getStudentAnalytics = () =>
  fetch(`${API_URL}/analytics/student`, { headers: getHeaders() }).then(handleResponse);

export const getTeacherAnalytics = (courseId) =>
  fetch(`${API_URL}/analytics/teacher/${courseId}`, { headers: getHeaders() }).then(handleResponse);

export const getAdminAnalytics = () =>
  fetch(`${API_URL}/analytics/admin`, { headers: getHeaders() }).then(handleResponse);

// Admin
export const getAdminStats = () =>
  fetch(`${API_URL}/admin/stats`, { headers: getHeaders() }).then(handleResponse);

export const getCourseRequests = () =>
  fetch(`${API_URL}/admin/requests`, { headers: getHeaders() }).then(handleResponse);

export const updateCourseRequest = (id, status, adminFeedback) =>
  fetch(`${API_URL}/admin/requests/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ status, adminFeedback }) }).then(handleResponse);

export const getAdminUsersList = () =>
  fetch(`${API_URL}/admin/users`, { headers: getHeaders() }).then(handleResponse);

export const updateUserRole = (id, role) =>
  fetch(`${API_URL}/admin/users/${id}/role`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ role }) }).then(handleResponse);

export const approveTeacher = (id, approvalStatus) =>
  fetch(`${API_URL}/admin/users/${id}/approve`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ approvalStatus }) }).then(handleResponse);

export const updateCourse = (id, data) =>
  fetch(`${API_URL}/courses/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse);

export const requestCourse = (data) =>
  fetch(`${API_URL}/courses/request`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse);

// AI Tutor
export const askTutor = (data) =>
  fetch(`${API_URL}/ai/tutor`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse);

export const getAITutorHistory = (topicId) =>
  fetch(`${API_URL}/ai/tutor/history/${topicId}`, { headers: getHeaders() }).then(handleResponse);

export const unenrollStudent = (courseId, teacherId) =>
  fetch(`${API_URL}/courses/${courseId}/unenroll-student/${teacherId}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse);

export const unenrollTeacher = (courseId) =>
  fetch(`${API_URL}/courses/${courseId}/unenroll-teacher`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse);

// Admin Messages
export const sendMessageToAdmin = (data) =>
  fetch(`${API_URL}/messages/admin`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse);

export const getMyAdminMessages = () =>
  fetch(`${API_URL}/messages/admin/my`, { headers: getHeaders() }).then(handleResponse);

export const getAllAdminMessages = () =>
  fetch(`${API_URL}/messages/admin/all`, { headers: getHeaders() }).then(handleResponse);

export const replyToAdminMessage = (id, data) =>
  fetch(`${API_URL}/messages/admin/${id}/reply`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse);
