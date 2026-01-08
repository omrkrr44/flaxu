import { AccessLevel, TokenType } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import config from '../config/env';
import { hashPassword, verifyPassword, generateToken } from '../utils/encryption';
import { emailService } from './email.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

interface RegisterInput {
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    accessLevel: AccessLevel;
    isVerified: boolean;
  };
  token: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register new user
   */
  async register(input: RegisterInput): Promise<{ message: string; email: string }> {
    const { email, password } = input;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Validate password strength
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('User already exists with this email', 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        isVerified: false,
        accessLevel: AccessLevel.LIMITED,
      },
    });

    // Generate verification token
    const verificationToken = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await prisma.verificationToken.create({
      data: {
        email: user.email,
        token: verificationToken,
        type: TokenType.EMAIL_VERIFICATION,
        expiresAt,
      },
    });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken);

    logger.info(`New user registered: ${email}`);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      email: user.email,
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    if (verificationToken.usedAt) {
      throw new AppError('Verification token already used', 400);
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new AppError('Verification token expired', 400);
    }

    if (verificationToken.type !== TokenType.EMAIL_VERIFICATION) {
      throw new AppError('Invalid token type', 400);
    }

    // Update user as verified
    await prisma.user.update({
      where: { email: verificationToken.email },
      data: { isVerified: true },
    });

    // Mark token as used
    await prisma.verificationToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    logger.info(`Email verified: ${verificationToken.email}`);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isVerified) {
      throw new AppError('Please verify your email before logging in', 403);
    }

    // Generate tokens
    const token = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        refreshToken,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`User logged in: ${email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        accessLevel: user.accessLevel,
        isVerified: user.isVerified,
      },
      token,
      refreshToken,
    };
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<{ message: string }> {
    await prisma.session.deleteMany({ where: { token } });
    return { message: 'Logged out successfully' };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    await prisma.verificationToken.create({
      data: {
        email: user.email,
        token: resetToken,
        type: TokenType.PASSWORD_RESET,
        expiresAt,
      },
    });

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken);

    logger.info(`Password reset requested: ${email}`);

    return { message: 'If an account exists with this email, a password reset link has been sent.' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    if (resetToken.usedAt) {
      throw new AppError('Reset token already used', 400);
    }

    if (resetToken.expiresAt < new Date()) {
      throw new AppError('Reset token expired', 400);
    }

    if (resetToken.type !== TokenType.PASSWORD_RESET) {
      throw new AppError('Invalid token type', 400);
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters long', 400);
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user password
    await prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    // Mark token as used
    await prisma.verificationToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    // Invalidate all sessions for this user
    const user = await prisma.user.findUnique({ where: { email: resetToken.email } });
    if (user) {
      await prisma.session.deleteMany({ where: { userId: user.id } });
    }

    logger.info(`Password reset: ${resetToken.email}`);

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ token: string }> {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new AppError('Invalid refresh token', 401);
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new AppError('Refresh token expired', 401);
    }

    // Generate new access token
    const newToken = this.generateAccessToken(session.user.id, session.user.email);

    // Update session
    await prisma.session.update({
      where: { id: session.id },
      data: { token: newToken },
    });

    return { token: newToken };
  }

  /**
   * Generate JWT access token
   */
  private generateAccessToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
}

export const authService = new AuthService();
