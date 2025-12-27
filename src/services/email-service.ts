import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  /**
   * Send password change email
   */
  sendChangePasswordEmail: async (
    email: string,
    username: string,
    token: string
  ): Promise<void> => {
    // Expo deep link for development
    const changePasswordUrl = `${process.env.LOCAL_IP}/--/change-password?token=${token}`;

    const emailOptions: EmailOptions = {
      to: email,
      subject: 'Change Your Password - Eventy',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Change Your Password</h2>
          <p>Hello ${username},</p>
          <p>We received a request to change your password. Click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${changePasswordUrl}"
               style="background-color: #007bff; color: white; padding: 12px 30px;
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Change Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">
            <a href="${changePasswordUrl}">${changePasswordUrl}</a>
          </p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not request this, ignore this email.</p>
        </div>
      `,
      text: `
Change Your Password - Eventy

Hello ${username},

Change your password using the link below:

${changePasswordUrl}

This link will expire in 1 hour.

If you did not request this, ignore this email.
      `,
    };

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.verify();

      await transporter.sendMail({
        from: `"Eventy" <${process.env.EMAIL_USER}>`,
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text,
      });

      console.log('Email successfully sent to:', emailOptions.to);
      console.log('Change Password URL:', changePasswordUrl);
    } catch (err) {
      console.error('Error sending change password email:', err);
      throw err;
    }
  },

  /**
   * Optional: Send welcome email
   */
  sendWelcomeEmail: async (email: string, username: string): Promise<void> => {
    console.log(`Welcome email would be sent to: ${email} (${username})`);
  },
};
