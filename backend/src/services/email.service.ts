import sgMail from '@sendgrid/mail';
import config from '../config/env';
import { logger } from '../utils/logger';

class EmailService {
  constructor() {
    // Initialize SendGrid
    if (config.SENDGRID_API_KEY) {
      sgMail.setApiKey(config.SENDGRID_API_KEY);
    } else {
      logger.warn('SendGrid API key not configured - email functionality will be disabled');
    }
  }

  /**
   * Send email using SendGrid
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!config.SENDGRID_API_KEY) {
      logger.warn(`Email not sent to ${to} - SendGrid not configured`);
      return;
    }

    try {
      await sgMail.send({
        to,
        from: config.EMAIL_FROM,
        replyTo: config.EMAIL_REPLY_TO,
        subject,
        html,
      });
      logger.info(`Email sent to ${to}: ${subject}`);
    } catch (error: any) {
      logger.error(`Failed to send email to ${to}:`, error.response?.body || error);
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXTAUTH_URL || 'https://flaxu.io';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to FLAXU!</h1>
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for registering with FLAXU - Ultimate Crypto Super App & Trading Terminal.</p>
              <p>Please click the button below to verify your email address and activate your account:</p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with FLAXU, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 FLAXU. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    await this.sendEmail(email, 'Verify Your Email - FLAXU', html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXTAUTH_URL || 'https://flaxu.io';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset the password for your FLAXU account.</p>
              <p>Click the button below to create a new password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2026 FLAXU. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    await this.sendEmail(email, 'Reset Your Password - FLAXU', html);
  }

  /**
   * Send balance warning notification
   */
  async sendBalanceWarning(email: string, currentBalance: number): Promise<void> {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .warning { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Balance Warning</h1>
            </div>
            <div class="content">
              <div class="warning">
                <h2>Your wallet balance is below the minimum threshold</h2>
                <p><strong>Current Balance:</strong> $${currentBalance.toFixed(2)}</p>
                <p><strong>Minimum Required:</strong> $200.00</p>
              </div>
              <p>To maintain full access to FLAXU trading features, please ensure your BingX wallet balance is at least $200.</p>
              <p><strong>Your access level will be downgraded to LIMITED if your balance remains below $200.</strong></p>
              <h3>What this means:</h3>
              <ul>
                <li>❌ Trading bots (ICT & Sniper) will be disabled</li>
                <li>❌ Advanced market intelligence features will be restricted</li>
                <li>✅ You can still view market data and your portfolio</li>
              </ul>
              <p>Please deposit funds to your BingX account to restore full access.</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 FLAXU. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    await this.sendEmail(email, 'Balance Warning - FLAXU', html);
  }

  /**
   * Send access downgraded notification
   */
  async sendAccessDowngraded(email: string, reason: string): Promise<void> {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff9800; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info { background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Access Level Updated</h1>
            </div>
            <div class="content">
              <div class="info">
                <h2>Your access has been changed to LIMITED</h2>
                <p><strong>Reason:</strong> ${reason}</p>
              </div>
              <p>Your FLAXU account access level has been downgraded to LIMITED.</p>
              <h3>To restore FULL access:</h3>
              <ol>
                <li>Ensure you are registered through our referral link (direct or indirect)</li>
                <li>Maintain a minimum BingX wallet balance of $200</li>
              </ol>
              <p>Once these requirements are met, your access will be automatically restored within 24 hours.</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 FLAXU. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    await this.sendEmail(email, 'Access Level Changed - FLAXU', html);
  }
}

export const emailService = new EmailService();
