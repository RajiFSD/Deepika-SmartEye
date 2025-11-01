const nodemailer = require('nodemailer');
const { Tenant, User } = require('@models');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  async init() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Verify connection configuration
      await this.transporter.verify();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Error initializing email service:', error);
    }
  }

  async sendAlertNotification(alertData) {
    try {
      const { camera, current_occupancy, max_occupancy, alertThreshold } = alertData;
      
      const subject = `🚨 Occupancy Alert - ${camera.camera_name}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Occupancy Alert</h2>
          <p><strong>Camera:</strong> ${camera.camera_name}</p>
          <p><strong>Location:</strong> ${camera.location_description || 'N/A'}</p>
          <p><strong>Current Occupancy:</strong> ${current_occupancy}</p>
          <p><strong>Maximum Threshold:</strong> ${max_occupancy}</p>
          <p><strong>Alert Time:</strong> ${new Date().toLocaleString()}</p>
          <hr>
          <p style="color: #666; font-size: 14px;">
            This alert was triggered because the occupancy count exceeded the configured threshold.
          </p>
        </div>
      `;

      const emails = alertThreshold.notification_email?.split(',') || [];
      await this.sendBulkEmail(emails, subject, html);

      console.log(`Alert notification sent for camera: ${camera.camera_name}`);
    } catch (error) {
      console.error('Error sending alert notification:', error);
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    try {
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const subject = '🔐 Password Reset Request';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Password Reset</h2>
          <p>You requested to reset your password. Click the link below to create a new password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this reset, please ignore this email.
          </p>
        </div>
      `;

      await this.sendEmail(email, subject, html);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(user) {
    try {
      const subject = '👋 Welcome to People Counting System';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Welcome aboard!</h2>
          <p>Hello ${user.full_name || user.username},</p>
          <p>Your account has been successfully created with the following details:</p>
          <ul>
            <li><strong>Username:</strong> ${user.username}</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Role:</strong> ${user.role}</li>
          </ul>
          <p>You can now access the People Counting System dashboard.</p>
          <hr>
          <p style="color: #666; font-size: 14px;">
            If you have any questions, please contact your system administrator.
          </p>
        </div>
      `;

      await this.sendEmail(user.email, subject, html);
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  async sendDailyReport(tenantId, reportData) {
    try {
      const tenant = await Tenant.findByPk(tenantId);
      const adminUsers = await User.findAll({
        where: { 
          tenant_id: tenantId, 
          role: ['admin', 'super_admin'],
          is_active: true
        }
      });

      const adminEmails = adminUsers.map(user => user.email);
      
      const subject = `📊 Daily Occupancy Report - ${tenant.tenant_name}`;
      const html = this.generateReportHTML(reportData, 'Daily');

      await this.sendBulkEmail(adminEmails, subject, html);
    } catch (error) {
      console.error('Error sending daily report:', error);
    }
  }

  async sendSystemAlert(subject, message, severity = 'error') {
    try {
      // Get all super admins for system-wide alerts
      const superAdmins = await User.findAll({
        where: { 
          role: 'super_admin',
          is_active: true
        }
      });

      const adminEmails = superAdmins.map(user => user.email);
      
      const icon = severity === 'error' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${severity === 'error' ? '#dc3545' : severity === 'warning' ? '#ffc107' : '#17a2b8'};">
            ${icon} System Alert
          </h2>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Severity:</strong> ${severity.toUpperCase()}</p>
        </div>
      `;

      await this.sendBulkEmail(adminEmails, `${icon} ${subject}`, html);
    } catch (error) {
      console.error('Error sending system alert:', error);
    }
  }

  // Core email sending methods
  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@peoplecounting.com',
        to,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendBulkEmail(recipients, subject, html, text = null) {
    if (!recipients || recipients.length === 0) {
      console.log('No recipients specified for bulk email');
      return;
    }

    const validRecipients = recipients.filter(email => 
      email && this.isValidEmail(email)
    );

    if (validRecipients.length === 0) {
      console.log('No valid email recipients found');
      return;
    }

    try {
      await this.sendEmail(validRecipients.join(','), subject, html, text);
    } catch (error) {
      console.error('Error sending bulk email:', error);
    }
  }

  // Helper methods
  generateReportHTML(reportData, reportType) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">${reportType} Occupancy Report</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h3>Summary</h3>
          <p><strong>Total Entries:</strong> ${reportData.total_entries || 0}</p>
          <p><strong>Total Exits:</strong> ${reportData.total_exits || 0}</p>
          <p><strong>Peak Occupancy:</strong> ${reportData.peak_occupancy || 0}</p>
          <p><strong>Active Alerts:</strong> ${reportData.active_alerts || 0}</p>
        </div>
        <hr>
        <p style="color: #666; font-size: 14px;">
          Report generated on ${new Date().toLocaleString()}
        </p>
      </div>
    `;
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = new EmailService();