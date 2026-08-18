/**
 * ClientAccountEmailService
 * Generates professional HTML emails for client account creation
 */

interface EmailVariables {
  customerName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  temporaryPassword?: string;
  tradingAccountId?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountType?: string;
  accountFeatures?: string;
  accountCreatedDate?: string;
  clientPortalUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  companyName?: string;
  adminName?: string;
  adminEmail?: string;
  [key: string]: any;
}

interface EmailPackage {
  subject: string;
  html: string;
  text: string;
  mailtoUrl: string;
}

interface EmailResponse {
  clientEmail: EmailPackage;
  adminNotification?: EmailPackage;
}

class ClientAccountEmailService {
  private config: any;
  private emailTemplate: string;

  constructor(config: any) {
    this.config = config;
    this.emailTemplate = this.getEmailTemplate();
  }

  /**
   * Generate account creation emails for client and admin
   */
  generateAccountCreationEmails(
    variables: EmailVariables,
    adminEmail?: string
  ): EmailResponse {
    try {
      // Generate client email
      const clientHtml = this.applySubstitutions(this.emailTemplate, variables);
      const clientSubject = `Welcome to ${variables.companyName || 'SafeGuard Securities'} — Your Account is Ready`;
      const clientText = this.htmlToPlainText(clientHtml);
      const clientMailtoUrl = this.generateMailtoUrl(
        variables.email || '',
        clientSubject,
        clientHtml
      );

      const clientEmail: EmailPackage = {
        subject: clientSubject,
        html: clientHtml,
        text: clientText,
        mailtoUrl: clientMailtoUrl,
      };

      // Generate optional admin notification
      let adminNotification: EmailPackage | undefined;
      if (adminEmail) {
        const adminHtml = this.generateAdminNotificationHtml(variables);
        const adminSubject = `New Account Created: ${variables.customerName || 'N/A'}`;
        const adminText = this.htmlToPlainText(adminHtml);
        const adminMailtoUrl = this.generateMailtoUrl(
          adminEmail,
          adminSubject,
          adminHtml
        );

        adminNotification = {
          subject: adminSubject,
          html: adminHtml,
          text: adminText,
          mailtoUrl: adminMailtoUrl,
        };
      }

      return {
        clientEmail,
        adminNotification,
      };
    } catch (error) {
      console.error('Error generating account creation emails:', error);
      // Return fallback simple email
      const fallbackSubject = `Welcome to ${variables.companyName || 'SafeGuard Securities'}`;
      const fallbackHtml = this.generateFallbackHtml(variables);
      return {
        clientEmail: {
          subject: fallbackSubject,
          html: fallbackHtml,
          text: this.htmlToPlainText(fallbackHtml),
          mailtoUrl: this.generateMailtoUrl(
            variables.email || '',
            fallbackSubject,
            fallbackHtml
          ),
        },
      };
    }
  }

  /**
   * Apply variable substitutions to template
   */
  private applySubstitutions(template: string, variables: EmailVariables): string {
    let result = template;

    // Replace all {{variable}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const replacement = value == null ? '' : String(value);
      result = result.replace(placeholder, replacement);
    });

    // Remove any remaining unreplaced variables
    result = result.replace(/{{[^}]+}}/g, '');

    return result;
  }

  /**
   * Get the HTML email template
   */
  private getEmailTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{companyName}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
            color: #333;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            overflow: hidden;
        }
        .header {
            background-color: #4A90E2;
            color: white;
            padding: 30px 20px;
            text-align: left;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .header-text {
            display: flex;
            flex-direction: column;
        }
        .logo-title {
            font-size: 16px;
            font-weight: bold;
            color: #ffffff;
            margin: 0;
        }
        .logo-subtitle {
            font-size: 11px;
            opacity: 0.9;
            letter-spacing: 1px;
            color: white;
            margin: 3px 0 0 0;
        }
        .header-right {
            text-align: right;
            font-size: 12px;
        }
        .header-link {
            color: #ffffff;
            text-decoration: none;
            display: block;
            margin-bottom: 3px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #003d82;
            margin-bottom: 20px;
        }
        .intro-text {
            color: #003d82;
            margin-bottom: 30px;
            font-size: 14px;
            line-height: 1.8;
        }
        .account-info-section {
            background-color: #f0f0f0;
            border: 1px solid #ddd;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #003d82;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #ddd;
            font-size: 14px;
            color: #003d82;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: #003d82;
        }
        .info-value {
            color: #003d82;
            text-align: right;
            word-break: break-all;
        }
        .highlight-box {
            background-color: #e8f4f8;
            border: 2px solid #003d82;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            font-size: 13px;
            color: #003d82;
        }
        .cta-section {
            text-align: center;
            margin: 30px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 14px 40px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 600;
            font-size: 14px;
        }
        .next-steps {
            background-color: #f0f0f0;
            border: 1px solid #ddd;
            padding: 20px;
            margin: 30px 0;
            border-radius: 4px;
        }
        .steps-list {
            list-style: none;
            margin-top: 15px;
        }
        .steps-list li {
            padding: 8px 0 8px 30px;
            position: relative;
            font-size: 14px;
            color: #003d82;
        }
        .steps-list li::before {
            content: '✓';
            position: absolute;
            left: 0;
            font-weight: bold;
            color: #4A90E2;
        }
        .security-notice {
            background-color: #ffe8e8;
            border-left: 4px solid #e74c3c;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 13px;
            color: #003d82;
        }
        .footer {
            background-color: #f0f0f0;
            color: #003d82;
            padding: 30px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #ddd;
        }
        .footer-section {
            margin-bottom: 15px;
        }
        .footer-title {
            font-weight: 600;
            margin-bottom: 5px;
            color: #003d82;
        }
        .footer-link {
            color: #003d82;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background-color: #ddd;
            margin: 15px 0;
        }
        .footer-note {
            font-size: 10px;
            color: #666;
            margin-top: 15px;
        }
        a {
            color: #003d82;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="header-left">
                <div class="header-text">
                    <p class="logo-title">SAFEGUARD</p>
                    <p class="logo-subtitle">SECURITIES, INC.</p>
                </div>
            </div>
        </div>
        <div class="content">
            <div class="greeting">Welcome, {{firstName}}!</div>
            <p class="intro-text">
                Thank you for opening a trading account with {{companyName}}. Your account has been successfully created and is ready to use. This email contains all the information you need to get started.
            </p>
            <div class="account-info-section">
                <div class="section-title">Account Access Information</div>
                <div class="info-row">
                    <span class="info-label">Email Address:</span>
                    <span class="info-value">{{email}}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Username:</span>
                    <span class="info-value">{{username}}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Temporary Password:</span>
                    <span class="info-value">{{temporaryPassword}}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Portal URL:</span>
                    <span class="info-value"><a href="{{clientPortalUrl}}">Access Portal</a></span>
                </div>
            </div>
            <div class="account-info-section">
                <div class="section-title">Trading Account Details</div>
                <div class="info-row">
                    <span class="info-label">Trading Account ID:</span>
                    <span class="info-value">{{tradingAccountId}}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Account Type:</span>
                    <span class="info-value">{{accountType}}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Account Status:</span>
                    <span class="info-value" style="color: #27ae60; font-weight: 600;">Active</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Account Creation Date:</span>
                    <span class="info-value">{{accountCreatedDate}}</span>
                </div>
            </div>
            <div class="cta-section">
                <a href="{{clientPortalUrl}}" class="cta-button">Login to Your Account</a>
            </div>
            <div class="highlight-box">
                <strong>⚠️ Important Security Notice</strong><br>
                For your security, you <strong>must change your temporary password</strong> on your first login.
            </div>
            <div class="security-notice">
                <strong>Security Best Practices:</strong><br>
                • Never share your login credentials with anyone<br>
                • Use a strong, unique password<br>
                • Enable two-factor authentication for added security<br>
                • Be cautious of phishing emails requesting your account information
            </div>
        </div>
        <div class="footer">
            <div class="footer-section">
                <div class="footer-title">Contact Information</div>
                <div style="margin: 8px 0; font-size: 13px;">
                    <strong>Phone:</strong> <a href="tel:{{supportPhone}}">{{supportPhone}}</a><br>
                    <strong>Email:</strong> <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>
                </div>
            </div>
            <div class="divider"></div>
            <div class="footer-note">
                © 2026 {{companyName}}. All rights reserved.<br>
                This is an automated message. Please do not reply to this email.
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate fallback HTML email for when template fails
   */
  private generateFallbackHtml(variables: EmailVariables): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #003d82;">Welcome to ${variables.companyName || 'SafeGuard Securities'}!</h1>
        <p>Dear ${variables.firstName} ${variables.lastName},</p>
        <p>Your trading account has been successfully created. Here are your account details:</p>

        <div style="background: #f0f0f0; padding: 15px; margin: 20px 0; border-left: 4px solid #4A90E2;">
            <p><strong>Login Information:</strong></p>
            <p>Email: ${variables.email}</p>
            <p>Username: ${variables.username}</p>
            <p>Temporary Password: ${variables.temporaryPassword}</p>
            <p>Portal: ${variables.clientPortalUrl}</p>
        </div>

        <div style="background: #f0f0f0; padding: 15px; margin: 20px 0; border-left: 4px solid #4A90E2;">
            <p><strong>Account Details:</strong></p>
            <p>Account Type: ${variables.accountType}</p>
            <p>Status: Active</p>
        </div>

        <p style="color: #e74c3c;"><strong>Important:</strong> You must change your temporary password on your first login for security purposes.</p>

        <p>Need help? Contact our support team:</p>
        <p>Email: ${variables.supportEmail}<br>Phone: ${variables.supportPhone}</p>

        <p>Best regards,<br>${variables.adminName}<br>${variables.companyName} Support Team</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate admin notification HTML
   */
  private generateAdminNotificationHtml(variables: EmailVariables): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #003d82;">New Client Account Created</h1>

        <div style="background: #f0f0f0; padding: 15px; margin: 20px 0; border-left: 4px solid #4A90E2;">
            <p><strong>Client Information:</strong></p>
            <p>Name: ${variables.customerName}</p>
            <p>Email: ${variables.email}</p>
            <p>Username: ${variables.username}</p>
            <p>Account Type: ${variables.accountType}</p>
            <p>Created: ${variables.accountCreatedDate}</p>
        </div>

        <p>The welcome email has been sent to the client's email address.</p>
        <p>No action is required at this time.</p>
    </div>
</body>
</html>`;
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToPlainText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  /**
   * Generate mailto URL
   */
  private generateMailtoUrl(
    to: string,
    subject: string,
    html: string
  ): string {
    if (!to) {
      console.warn('No email recipient specified');
      return '';
    }

    // For HTML content, we encode it as the email body
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(html);

    return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
  }
}

export default ClientAccountEmailService;
