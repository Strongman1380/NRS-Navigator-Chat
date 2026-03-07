import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

/**
 * Sends an email using Hostinger SMTP.
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @param {string} html - Email body HTML (optional)
 * @returns {Promise<Object>} - The nodemailer send result
 */
export async function sendHostingerEmail({ to, subject, text, html }) {
  const user = process.env.HOSTINGER_EMAIL_USER;
  const pass = process.env.HOSTINGER_EMAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error("PICA tools fall back: HOSTINGER_EMAIL_USER and HOSTINGER_EMAIL_PASSWORD are not set in environment variables");
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true, 
    auth: { user, pass }
  });

  const message = {
    from: user,
    to,
    subject,
    text,
    html: html || text // fallback to text if html not provided
  };

  const info = await transporter.sendMail(message);
  return { success: true, messageId: info.messageId };
}

/**
 * Connects to Hostinger IMAP to retrieve unread emails.
 * 
 * @param {number} limit - Maximum number of recent unread emails to fetch
 * @returns {Promise<Array>} - Array of parsed email objects
 */
export async function fetchUnreadHostingerEmails(limit = 10) {
  const user = process.env.HOSTINGER_EMAIL_USER;
  const pass = process.env.HOSTINGER_EMAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error("PICA tools fall back: HOSTINGER_EMAIL_USER and HOSTINGER_EMAIL_PASSWORD are not set in environment variables");
  }

  const config = {
    imap: {
      user: user,
      password: pass,
      host: 'imap.hostinger.com',
      port: 993,
      tls: true,
      authTimeout: 3000,
      tlsOptions: { rejectUnauthorized: false } // Required for some node environments
    }
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    // Fetch unread emails
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false // Do not mark as seen just by checking
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const emails = [];

    // Only process up to `limit` emails starting from the most recent
    const recentMessages = messages.slice(-limit);

    for (const item of recentMessages) {
      const all = item.parts.find((part) => part.which === '');
      const id = item.attributes.uid;
      const idHeader = "Imap-Id: "+id+"\r\n";
      
      const parsed = await simpleParser(idHeader + all.body);

      emails.push({
        id: id,
        from: parsed.from?.text || 'Unknown',
        subject: parsed.subject || 'No Subject',
        date: parsed.date,
        text: parsed.text?.substring(0, 1000) || 'No Content', // truncate for context window
      });
    }

    connection.end();
    return emails.reverse(); // Most recent first
  } catch (error) {
    console.error("IMAP Error:", error);
    throw new Error(`Failed to fetch Hostinger emails: ${error.message}`);
  }
}
