import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';

export const generateTokens = (userId) => {
  // Ensure userId is a string
  const userIdStr = userId?.toString() || userId;
  
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets not configured');
  }
  
  const accessToken = jwt.sign(
    { userId: userIdStr },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: userIdStr, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

export const createSession = async (userId, accessToken, refreshToken, deviceInfo) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days for refresh token

  const session = await Session.create({
    userId,
    token: accessToken,
    refreshToken,
    deviceInfo,
    expiresAt
  });

  return session;
};

export const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const session = await Session.findOne({
      refreshToken,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      throw new Error('Session not found or expired');
    }

    const { accessToken } = generateTokens(decoded.userId);
    session.token = accessToken;
    session.lastActivity = new Date();
    await session.save();

    return accessToken;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

export const invalidateSession = async (token) => {
  await Session.updateOne(
    { token },
    { isActive: false }
  );
};

export const invalidateAllSessions = async (userId) => {
  await Session.updateMany(
    { userId, isActive: true },
    { isActive: false }
  );
};

