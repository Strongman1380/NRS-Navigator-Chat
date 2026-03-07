import { exchangeCode } from '../services/googleCalendar.js';

export default async function handler(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.send(`
        <html>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1 style="color: #dc3545;">Authorization Failed</h1>
            <p>Missing authorization code. Please try again.</p>
            <a href="/">Return to App</a>
          </body>
        </html>
      `);
    }

    const { tokens } = await exchangeCode(code);

    res.send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1 style="color: #22c55e;">Authorization Successful!</h1>
          <p>Google Calendar and Drive are now connected.</p>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            Save this token as <code>GOOGLE_TOKEN</code> in your Vercel environment variables:
          </p>
          <textarea readonly style="width: 100%; max-width: 600px; height: 120px; font-family: monospace; font-size: 12px; padding: 12px; margin-top: 8px;">${JSON.stringify(tokens)}</textarea>
          <br><br>
          <a href="/" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Return to App</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in callback:', error);
    res.send(`
      <html>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1 style="color: #dc3545;">Authorization Failed</h1>
          <p>${error.message}</p>
          <a href="/">Return to App</a>
        </body>
      </html>
    `);
  }
}
