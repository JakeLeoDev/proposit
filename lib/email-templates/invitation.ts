export interface InvitationEmailData {
	organisationName: string;
	invitedByName: string;
	invitationUrl: string;
}

export function buildInvitationEmail(data: InvitationEmailData): {
	subject: string;
	html: string;
	text: string;
} {
	const subject = `Einladung zu ${data.organisationName}`;

	const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #e4e4e7;">
              <p style="margin:0;font-size:20px;font-weight:600;color:#18181b;">${data.organisationName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#18181b;">Du wurdest eingeladen</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#52525b;">
                <strong>${data.invitedByName}</strong> hat dich eingeladen, dem Team von <strong>${data.organisationName}</strong> beizutreten.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px;background-color:#18181b;">
                    <a href="${data.invitationUrl}" target="_blank"
                       style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
                      Einladung annehmen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;">
                Oder kopiere diesen Link in deinen Browser:<br />
                <a href="${data.invitationUrl}" style="color:#52525b;word-break:break-all;">${data.invitationUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Diese Einladung ist 7 Tage gültig. Falls du diese Einladung nicht erwartet hast, kannst du sie ignorieren.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

	const text = `
Du wurdest eingeladen, dem Team von ${data.organisationName} beizutreten.

${data.invitedByName} hat dich eingeladen.

Klicke auf den folgenden Link, um die Einladung anzunehmen:
${data.invitationUrl}

Diese Einladung ist 7 Tage gültig.
  `.trim();

	return { subject, html, text };
}
