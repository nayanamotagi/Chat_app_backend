import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import chatRoutes from './routes/chats.js';
import messageRoutes from './routes/messages.js';
import groupRoutes from './routes/groups.js';
import callRoutes from './routes/calls.js';
import statusRoutes from './routes/status.js';
import aiRoutes from './routes/ai.js';
import uploadRoutes from './routes/uploads.js';
import { initializeSocket } from './socket/socket.js';
import { errorHandler } from './middleware/errorHandler.js';
import rateLimiter from './middleware/rateLimiter.js';
import { setSocketIO } from './utils/socketHelper.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('❌ Missing required environment variable: JWT_SECRET');
  process.exit(1);
}

if (!process.env.JWT_REFRESH_SECRET) {
  console.warn('⚠️ JWT_REFRESH_SECRET is not set. Falling back to JWT_SECRET for refresh tokens.');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Socket.IO
initializeSocket(io);

// Set socket IO in helper for use in routes
setSocketIO(io);

// Error handling
app.use(errorHandler);

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nayanamotagi24_db_user:5kZQCbjsHjvIKkiA@cluster0.pdvvlu6.mongodb.net/chat_app?retryWrites=true&w=majority&appName=Cluster0';

function maskUri(uri) {
  try {
    const start = uri.indexOf('://');
    if (start === -1) return uri;
    const after = uri.slice(start + 3);
    const at = after.indexOf('@');
    if (at === -1) return uri;
    const creds = after.slice(0, at);
    const colon = creds.indexOf(':');
    if (colon === -1) return uri;
    const user = creds.slice(0, colon + 1);
    return uri.replace(user + creds.slice(colon + 1) + '@', user + '****@');
  } catch (e) {
    return uri;
  }
}

const mongooseOptions = {
  serverSelectionTimeoutMS: 10000
};

console.log('🔗 Attempting MongoDB connection to:', maskUri(MONGODB_URI));

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => console.log('✅ MongoDB connected to chat_app database'))
  .catch(err => {
    console.error('❌ MongoDB connection error:');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export { io };

