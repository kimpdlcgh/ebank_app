export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  id?: string;
  error?: string;
}

/**
 * Sends an email via the /api/send-email serverless function (Resend).
 * Requires RESEND_API_KEY to be configured server-side (see .env.example).
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to send email');
  }

  return result;
}
