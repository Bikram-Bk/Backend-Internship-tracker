// Mock email service for development
// In production, replace with actual email service (SendGrid, AWS SES, etc.)

import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  /**
   * Send password reset email
   */
  sendPasswordResetEmail: async (
    email: string,
    username: string,
    resetToken: string
  ): Promise<void> => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const emailOptions: EmailOptions = {
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${username},</p>
          <p>We received a request to reset your password. If you made this request, click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            This is an automated email, please do not reply to this message.
          </p>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hello ${username},
        
        We received a request to reset your password. If you made this request, 
        please visit the following link to reset your password:
        
        ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you did not request a password reset, please ignore this email.
      `,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('=== EMAIL SENT (DEVELOPMENT MODE) ===');
      console.log('To:', emailOptions.to);
      console.log('Subject:', emailOptions.subject);
      console.log('Reset URL:', resetUrl);
      console.log('=====================================');
      return;
    }

    // Production: Send email using Nodemailer and Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NEXT_PUBLIC_EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Internship Issue Tracker" <${process.env.NEXT_PUBLIC_EMAIL_USER}>`,
      to: emailOptions.to,
      subject: emailOptions.subject,
      html: emailOptions.html,
      text: emailOptions.text,
    });

    console.log('Email sent to:', emailOptions.to);
    console.log('Reset URL:', resetUrl);
  },

  /**
   * Send welcome email (placeholder)
   */
  sendWelcomeEmail: async (email: string, username: string): Promise<void> => {
    console.log(`Welcome email would be sent to: ${email} (${username})`);
  },

  /**
   * Test email connectivity
   */
  testConnection: async (): Promise<boolean> => {
    // In development, always return true
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // TODO: Implement actual email service connection test
    return true;
  },
};
