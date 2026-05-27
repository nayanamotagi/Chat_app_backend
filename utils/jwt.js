import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';

const getJwtSecrets = () => {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

  if (!accessSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return { accessSecret, refreshSecret };
};

export const generateTokens = (userId) => {
  // Ensure userId is a string
  const userIdStr = userId?.toString() || userId;
  const { accessSecret, refreshSecret } = getJwtSecrets();

  const accessToken = jwt.sign(
    { userId: userIdStr },
    accessSecret,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: userIdStr, type: 'refresh' },
    refreshSecret,
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
    const { refreshSecret } = getJwtSecrets();
    const decoded = jwt.verify(refreshToken, refreshSecret);

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

