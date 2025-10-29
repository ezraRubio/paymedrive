import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailConfig {
  service: string;
  auth: {
    user: string;
    pass: string;
  };
}

let transporter: Transporter | null = null;

const initializeTransporter = (): Transporter => {
  const config: EmailConfig = {
    service: 'icloud',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };

  return nodemailer.createTransport(config);
};

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = initializeTransporter();
  }
  return transporter;
};

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
  try {
    const transport = getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@paymedrive.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    };

    const info = await transport.sendMail(mailOptions);

    logger.info(`Email sent successfully to ${options.to}`, {
      messageId: info.messageId,
    });

    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}:`, error);
    return false;
  }
};

export const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
  const subject = 'Your Pay Me Drive OTP Code';

  const text = `
Your OTP code for Pay Me Drive is: ${otp}

This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.

If you didn't request this code, please ignore this email.

Best regards,
Pay Me Drive Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Pay Me Drive OTP Verification</h2>
      <p>Your OTP code is:</p>
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #666;">This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>
      <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">Best regards,<br>Pay Me Drive Team</p>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
};

export const testEmailConnection = async (): Promise<boolean> => {
  try {
    const transport = getTransporter();
    await transport.verify();
    logger.info('Email connection verified successfully');
    return true;
  } catch (error) {
    logger.error('Email connection verification failed:', error);
    return false;
  }
};
