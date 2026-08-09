export const BRAND = {
  primary: "#6C3BFF",
  primaryDark: "#5A2EE6",
  text: "#1F2937",
  muted: "#6B7280",
  bg: "#F9FAFB",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

const DEFAULT_APP_URL = "https://sync.joinhashcode.com";

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_DOMAIN;
  const clean = configured?.trim();
  return clean && clean.length > 0 ? clean.replace(/\/+$/, "") : DEFAULT_APP_URL;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function wrap(content: string, title: string, preview?: string): string {
  const appUrl = getAppUrl();
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  ${preview ? `<meta name="description" content="${escapeHtml(preview)}" />` : ""}
  <style>
    body { margin: 0; padding: 0; background-color: ${BRAND.bg}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: ${BRAND.text}; }
    a { color: ${BRAND.primary}; text-decoration: none; }
    .button { display: inline-block; padding: 12px 24px; background-color: ${BRAND.primary}; color: #ffffff; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .button:hover { background-color: ${BRAND.primaryDark}; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.bg}; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:${BRAND.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color:${BRAND.surface}; border-radius: 16px; overflow: hidden; border: 1px solid ${BRAND.border};">
          <tr>
            <td style="background-color:${BRAND.primary}; padding: 24px 32px; text-align: center;">
              <img src="${appUrl}/brand/hashcode-sync-logo-light.svg" alt="HashCode Sync" width="160" height="32" style="display:block; margin:0 auto; border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; text-align: center; border-top: 1px solid ${BRAND.border};">
              <p style="margin: 0; font-size: 12px; color: ${BRAND.muted};">
                HashCode Sync — Identifie. Développe. Impacte.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: ${BRAND.muted};">
                <a href="${appUrl}" style="color:${BRAND.primary}; text-decoration: none;">${appUrl.replace(/^https?:\/\//, "")}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function actionButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
    <tr>
      <td>
        <a href="${escapeHtml(href)}" class="button" style="display:inline-block; padding:12px 24px; background-color:${BRAND.primary}; color:#ffffff; border-radius:8px; font-weight:600; font-size:14px; text-decoration:none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

export function heading(text: string): string {
  return `<h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: ${BRAND.text};">${escapeHtml(text)}</h1>`;
}

export function paragraph(text: string): string {
  return `<p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: ${BRAND.muted};">${text}</p>`;
}

export function highlightBox(text: string, tone: "info" | "success" | "warning" | "error" = "info"): string {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    info: { bg: "#EEF2FF", border: BRAND.primary, text: BRAND.text },
    success: { bg: "#ECFDF5", border: BRAND.success, text: "#065F46" },
    warning: { bg: "#FFFBEB", border: BRAND.warning, text: "#92400E" },
    error: { bg: "#FEF2F2", border: BRAND.error, text: "#991B1B" },
  };
  const c = colors[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; background-color:${c.bg}; border-left: 4px solid ${c.border}; border-radius: 8px;">
    <tr><td style="padding: 12px 16px; font-size: 14px; color: ${c.text};">${escapeHtml(text)}</td></tr>
  </table>`;
}

export function footerNote(text: string): string {
  return `<p style="margin: 16px 0 0; font-size: 12px; line-height: 1.5; color: ${BRAND.muted};">${escapeHtml(text)}</p>`;
}
