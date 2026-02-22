export interface ProposalEmailData {
	organisationName: string;
	proposalName: string;
	proposalNumber: string | null;
	recipientName: string;
	proposalUrl: string;
	expiryDate: string;
	personalMessage?: string;
}

export function buildProposalEmail(data: ProposalEmailData): {
	subject: string;
	html: string;
	text: string;
} {
	const proposalTitle = data.proposalNumber
		? `${data.proposalNumber} – ${data.proposalName}`
		: data.proposalName;

	const subject = `Angebot: ${proposalTitle}`;

	const personalMessageHtml = data.personalMessage
		? `
          <div style="margin:0 0 24px;padding:16px;background-color:#f4f4f5;border-radius:6px;border-left:3px solid #18181b;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;white-space:pre-wrap;">${data.personalMessage}</p>
          </div>`
		: '';

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
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181b;">Angebot erhalten</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#52525b;">
                Hallo ${data.recipientName},<br /><br />
                wir haben dir ein neues Angebot von <strong>${data.organisationName}</strong> geschickt.
              </p>
              ${personalMessageHtml}
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#f4f4f5;border-radius:6px;padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:13px;color:#a1a1aa;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">Angebot</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#18181b;">${proposalTitle}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Gültig bis: ${data.expiryDate}</p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px;background-color:#18181b;">
                    <a href="${data.proposalUrl}" target="_blank"
                       style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
                      Angebot ansehen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;">
                Oder kopiere diesen Link in deinen Browser:<br />
                <a href="${data.proposalUrl}" style="color:#52525b;word-break:break-all;">${data.proposalUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Diese Email wurde von ${data.organisationName} gesendet. Das Angebot ist bis zum ${data.expiryDate} gültig.
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
Hallo ${data.recipientName},

${data.organisationName} hat dir ein Angebot geschickt.
${data.personalMessage ? `\n${data.personalMessage}\n` : ''}
Angebot: ${proposalTitle}
Gültig bis: ${data.expiryDate}

Klicke auf den folgenden Link, um das Angebot anzusehen:
${data.proposalUrl}
  `.trim();

	return { subject, html, text };
}
