import { Resend } from "resend";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

const SEVERITY_EMOJI: Record<string, string> = {
  info: "ℹ️",
  warning: "⚠️",
  critical: "🔴",
};

const SEVERITY_COLOR: Record<string, string> = {
  info: "#3b82f6",
  warning: "#f59e0b",
  critical: "#ef4444",
};

export interface AlertEmailData {
  to: string;
  tripName: string;
  alertTitle: string;
  alertDescription: string;
  severity: "info" | "warning" | "critical";
  previousValue: string | null;
  currentValue: string | null;
  segmentInfo: string | null;
  briefingUrl: string | null;
}

export async function sendConditionAlert(data: AlertEmailData): Promise<void> {
  const emoji = SEVERITY_EMOJI[data.severity] ?? "ℹ️";
  const color = SEVERITY_COLOR[data.severity] ?? "#3b82f6";
  const subject = `${emoji} ${data.tripName} — ${data.alertTitle}`;

  const changeRow =
    data.previousValue && data.currentValue
      ? `
        <tr>
          <td style="padding: 4px 0; color: #78716c; font-size: 13px;">Previous</td>
          <td style="padding: 4px 0; color: #44403c; font-size: 13px;">${data.previousValue}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #78716c; font-size: 13px;">Now</td>
          <td style="padding: 4px 0; font-weight: 600; font-size: 13px; color: ${color};">${data.currentValue}</td>
        </tr>`
      : "";

  const segmentRow = data.segmentInfo
    ? `<p style="margin: 8px 0 0; font-size: 13px; color: #78716c;">Affected: ${data.segmentInfo}</p>`
    : "";

  const ctaButton = data.briefingUrl
    ? `
      <a href="${data.briefingUrl}"
         style="display: inline-block; margin-top: 20px; padding: 10px 22px;
                background-color: #059669; color: white; text-decoration: none;
                border-radius: 6px; font-size: 14px; font-weight: 600;">
        View Updated Briefing →
      </a>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 32px auto; background: white; border-radius: 8px; border: 1px solid #e7e5e4; overflow: hidden;">
        <!-- Header -->
        <tr>
          <td style="background-color: ${color}; padding: 16px 24px;">
            <span style="font-size: 22px; font-weight: 800; color: white;">Strange Grounds</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding: 24px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #a8a29e;">
              Conditions Update · ${data.tripName}
            </p>
            <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #1c1917;">
              ${emoji} ${data.alertTitle}
            </h1>
            <p style="margin: 0 0 16px; font-size: 14px; color: #57534e; line-height: 1.5;">
              ${data.alertDescription}
            </p>
            ${
              changeRow
                ? `<table style="border-collapse: collapse; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 6px; padding: 12px; width: 100%;">
                    <tbody>${changeRow}</tbody>
                   </table>`
                : ""
            }
            ${segmentRow}
            ${ctaButton}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 16px 24px; background: #fafaf9; border-top: 1px solid #e7e5e4;">
            <p style="margin: 0; font-size: 12px; color: #a8a29e; line-height: 1.5;">
              You're receiving this because trip monitoring is enabled for this trip.
              To stop these notifications, disable monitoring in your trip settings.
            </p>
            <p style="margin: 8px 0 0; font-size: 12px; color: #a8a29e;">
              Strange Grounds — Backcountry Conditions Intelligence
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await getResend().emails.send({
    from: "Strange Grounds <alerts@strange-grounds.com>",
    to: data.to,
    subject,
    html,
  });
}
