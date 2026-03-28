import axios from 'axios';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

const GUPSHUP_API = 'https://api.gupshup.io/sm/api/v1/msg';

/**
 * Send a plain text message via Gupshup WhatsApp API.
 */
export async function sendText(to: string, text: string): Promise<void> {
  const phone = normalizePhone(to);
  try {
    await axios.post(
      GUPSHUP_API,
      new URLSearchParams({
        channel: 'whatsapp',
        source: config.gupshup.whatsappNumber,
        destination: phone,
        message: JSON.stringify({ type: 'text', text }),
        'src.name': config.gupshup.appName,
      }),
      {
        headers: {
          apikey: config.gupshup.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );
    logger.debug('Sent WhatsApp message', { to: phone, preview: text.slice(0, 50) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Gupshup send error', { error: msg, to: phone });
  }
}

/**
 * Send a list of quick-reply buttons.
 */
export async function sendButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  const phone = normalizePhone(to);
  const message = {
    type: 'quick_reply',
    msgid: `msg_${Date.now()}`,
    content: { type: 'text', text: body },
    options: buttons.map((b) => ({ type: 'text', title: b.title, postbackText: b.id })),
  };

  try {
    await axios.post(
      GUPSHUP_API,
      new URLSearchParams({
        channel: 'whatsapp',
        source: config.gupshup.whatsappNumber,
        destination: phone,
        message: JSON.stringify(message),
        'src.name': config.gupshup.appName,
      }),
      {
        headers: {
          apikey: config.gupshup.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );
  } catch (err: unknown) {
    // Fall back to plain text if buttons fail
    logger.warn('Button send failed, falling back to text', { to: phone });
    const fallback = body + '\n\n' + buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
    await sendText(to, fallback);
  }
}

function normalizePhone(phone: string): string {
  // Strip +, spaces, dashes. Add 91 prefix for Indian numbers if missing.
  const clean = phone.replace(/[+\s\-]/g, '');
  if (clean.length === 10) return `91${clean}`;
  return clean;
}
