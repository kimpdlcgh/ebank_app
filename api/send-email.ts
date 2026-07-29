import { Resend } from 'resend';

// Minimal structural types for the Vercel Node request/response objects.
// Avoids depending on @vercel/node purely for typing.
interface VercelRequest {
  method?: string;
  body?: {
    to?: string | string[];
    subject?: string;
    html?: string;
    text?: string;
    replyTo?: string;
  };
}

interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'accounts@frbr.us';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
  }

  const { to, subject, html, text, replyTo } = req.body || {};

  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, and html or text' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
      replyTo,
    });

    if (error) {
      return res.status(502).json({ error: error.message || 'Failed to send email' });
    }

    return res.status(200).json({ id: data?.id });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unexpected error sending email' });
  }
}
