// Branded verification email for add-on approvals. Built as table-based, inline-styled
// HTML for broad email-client support (Gmail, Apple Mail, Outlook), with a clean plain-text
// fallback. The verification code is the hero element — large, spaced, in its own card —
// and also appears in the subject + preheader so it's findable from the inbox list.

export type AddonEmailItem = {
  quantity: number;
  name: string;
  lineTotal: number;
  unitLabel: string;
  unitPrice: number;
};

export type AddonEmailInput = {
  clientName: string;
  artistName: string;
  businessName: string;
  bookingHeadline: string;
  items: AddonEmailItem[];
  total: number;
  code: string;
  expiresMinutes: number;
  artistEmail?: string | null;
};

function esc(value: string): string {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

// Brand palette — warm ivory / antique gold / near-black ink.
const C = {
  page: "#efeae2",
  card: "#ffffff",
  border: "#ece5d8",
  ink: "#211c18",
  muted: "#8c8174",
  soft: "#5f574d",
  gold: "#c2a25f",
  codeBg: "#faf6ee",
  codeBorder: "#ead9b8",
  panel: "#faf8f4",
};

export function renderAddonApprovalEmail(input: AddonEmailInput): { subject: string; text: string; html: string } {
  const greeting = firstName(input.clientName);
  const itemRowsHtml = input.items
    .map((i, idx) => {
      const label = `${i.quantity > 1 ? `${i.quantity} &times; ` : ""}${esc(i.name)}`;
      const top = idx === 0 ? "" : `border-top:1px solid ${C.border};`;
      return `
        <tr>
          <td style="${top}padding:12px 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:${C.ink};line-height:1.4;">
            ${label}
            <div style="font-size:12px;color:${C.muted};margin-top:2px;">${money(i.unitPrice)} / ${esc(i.unitLabel)}</div>
          </td>
          <td style="${top}padding:12px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:${C.ink};text-align:right;white-space:nowrap;vertical-align:top;">
            ${money(i.lineTotal)}
          </td>
        </tr>`;
    })
    .join("");

  const subject = `${input.code} is your ${input.businessName} approval code`;
  const preheader = `Your verification code is ${input.code} — expires in ${input.expiresMinutes} minutes.`;
  const codeSpaced = input.code.split("").join(" "); // plain-text spacing for legibility

  const contactLine = input.artistEmail
    ? `<div style="margin-top:6px;">Questions? Email <a href="mailto:${esc(input.artistEmail)}" style="color:${C.soft};text-decoration:underline;">${esc(input.artistEmail)}</a>.</div>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<style>
  @media only screen and (max-width:480px) {
    .code-digits { font-size:30px !important; letter-spacing:8px !important; }
    .wrap-pad { padding:24px 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background-color:${C.card};border:1px solid ${C.border};border-radius:18px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td class="wrap-pad" style="padding:34px 40px 0 40px;text-align:center;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.muted};">${esc(input.businessName)}</div>
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;color:${C.ink};margin-top:6px;">${esc(input.artistName)}</div>
              <div style="width:44px;height:2px;background-color:${C.gold};margin:18px auto 0 auto;border-radius:2px;"></div>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td class="wrap-pad" style="padding:26px 40px 0 40px;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.gold};font-weight:bold;">Add-on approval</div>
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.25;color:${C.ink};font-weight:normal;margin:8px 0 0 0;">${esc(input.bookingHeadline)}</h1>
              <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${C.soft};margin:14px 0 0 0;">
                Hi ${esc(greeting)}, ${esc(input.artistName)} has requested your approval for the add-on${input.items.length > 1 ? "s" : ""} below. Use the one-time code to confirm — nothing is charged until you approve.
              </p>
            </td>
          </tr>
          <!-- Code card -->
          <tr>
            <td class="wrap-pad" style="padding:26px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.codeBg};border:1px solid ${C.codeBorder};border-radius:14px;">
                <tr>
                  <td style="padding:24px;text-align:center;">
                    <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.muted};">Your verification code</div>
                    <div class="code-digits" style="font-family:Helvetica,Arial,sans-serif;font-size:40px;font-weight:bold;letter-spacing:12px;color:${C.ink};margin-top:12px;padding-left:12px;">${esc(input.code)}</div>
                    <div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${C.muted};margin-top:12px;">Expires in ${input.expiresMinutes} minutes · enter it on the approval page</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Add-on summary -->
          <tr>
            <td class="wrap-pad" style="padding:26px 40px 0 40px;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin-bottom:4px;">Requested add-on${input.items.length > 1 ? "s" : ""}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.panel};border:1px solid ${C.border};border-radius:12px;">
                <tr><td style="padding:6px 18px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    ${itemRowsHtml}
                    <tr>
                      <td style="border-top:2px solid ${C.border};padding:14px 0 4px 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">Total to add</td>
                      <td style="border-top:2px solid ${C.border};padding:14px 0 4px 0;font-family:Georgia,'Times New Roman',serif;font-size:21px;color:${C.ink};text-align:right;">${money(input.total)}</td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <!-- Reassurance + footer -->
          <tr>
            <td class="wrap-pad" style="padding:24px 40px 36px 40px;">
              <div style="border-top:1px solid ${C.border};padding-top:18px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${C.muted};">
                If you weren't expecting this, you can safely ignore this email — nothing will be charged.
                ${contactLine}
                <div style="margin-top:14px;color:#b3aa9c;">${esc(input.businessName)} · This code is private; please don't share it.</div>
              </div>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;

  const itemLinesText = input.items
    .map((i) => `  - ${i.quantity > 1 ? `${i.quantity} x ` : ""}${i.name} — ${money(i.lineTotal)}`)
    .join("\n");

  const text =
    `Hi ${greeting},\n\n` +
    `${input.artistName} has requested your approval for the following add-on${input.items.length > 1 ? "s" : ""} to "${input.bookingHeadline}":\n\n` +
    `${itemLinesText}\n` +
    `  Total to add: ${money(input.total)}\n\n` +
    `========================================\n` +
    `  YOUR VERIFICATION CODE:  ${codeSpaced}\n` +
    `========================================\n\n` +
    `This code expires in ${input.expiresMinutes} minutes. Enter it on the approval page to approve or decline.\n\n` +
    `If you weren't expecting this, you can ignore this email — nothing will be charged.\n` +
    (input.artistEmail ? `\nQuestions? Email ${input.artistEmail}.\n` : "") +
    `\n${input.businessName} · This code is private; please don't share it.`;

  return { subject, text, html };
}
