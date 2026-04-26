const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');
const setupSocket = require('./socket/socketHandler');

// Import routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const topicRoutes = require('./routes/topics');
const quizRoutes = require('./routes/quizzes');
const paperRoutes = require('./routes/papers');
const groupRoutes = require('./routes/groups');
const leaderboardRoutes = require('./routes/leaderboard');
const analyticsRoutes = require('./routes/analytics');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

// DIRECT AI TEST ROUTE (for troubleshooting)
app.get('/test-ai', async (req, res) => {
  try {
    const { askAITutor } = require('./services/geminiService');
    const response = await askAITutor({
      topicName: 'System Test',
      question: 'Respond with "AI_WORKING"'
    });
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, key: process.env.GEMINI_API_KEY ? 'Present' : 'MISSING' });
  }
});

app.get('/api/test-ai', async (req, res) => {
  try {
    const { askAITutor } = require('./services/geminiService');
    const response = await askAITutor({
      topicName: 'System Test',
      question: 'Respond with "AI_WORKING"'
    });
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, key: process.env.GEMINI_API_KEY ? 'Present' : 'MISSING' });
  }
});

// Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// Socket.io setup
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
console.log('Configured FRONTEND_URL:', frontendUrl);

const io = new Server(server, {
  cors: {
    origin: [frontendUrl, frontendUrl.replace(/\/$/, '')],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [frontendUrl, frontendUrl.replace(/\/$/, ''), 'http://localhost:3000'];
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler — catches multer, cloudinary, and any unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// Setup Socket.io
setupSocket(io);

// Seed admin and courses
const seedData = require('./config/seed');

// Connect to DB and start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedData();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Socket.io ready`);
  });
};

startServer();

module.exports = { app, server, io };
