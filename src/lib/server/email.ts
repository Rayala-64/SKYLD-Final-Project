/**
 * Transactional Email Dispatcher for SKYLD Platform
 * Compatible with Resend Free Tier (3,000 emails/month) or Nodemailer / Gmail SMTP ($0).
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "SKYLD Learning <alerts@skyld.com>",
          to: [to],
          subject,
          html,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Resend API Error:", data);
        return { success: false, error: data.message };
      }

      return { success: true, messageId: data.id };
    } catch (err: any) {
      console.error("Email send failed:", err);
      return { success: false, error: err.message };
    }
  }

  // Graceful fallback for local development or when API keys are pending
  console.log(`📧 [EMAIL DISPATCHED - Simulation Mode] To: ${to} | Subject: "${subject}"`);
  return { success: true, messageId: `mock-${Date.now()}` };
}

/**
 * Pre-formatted HTML template for Daily Ritual Deadline Countdown
 */
export function getRitualDeadlineEmailHtml(studentName: string, word: string, hoursRemaining: number): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 24px;">SKYLD English Fluency</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Daily Vocabulary & Speech Mastery</p>
      </div>
      <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
        <h2 style="color: #fbbf24; margin-top: 0; font-size: 18px;">🔥 Keep Your Daily Streak Alive!</h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Hi ${studentName}, you have approximately <strong>${hoursRemaining} hours remaining</strong> before midnight to complete your 10-step ritual for today's word: <strong>${word}</strong>.
        </p>
        <div style="text-align: center; margin: 28px 0 12px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://skyld.com'}/vault/dashboard" style="background-color: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Complete Step 1 Now →
          </a>
        </div>
      </div>
      <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">
        © ${new Date().getFullYear()} SKYLD. All rights reserved.
      </p>
    </div>
  `;
}
