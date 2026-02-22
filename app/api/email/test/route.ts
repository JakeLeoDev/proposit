import { getUser, getUserOrganisation } from '@/lib/auth';
import { sendEmail, type SmtpConfig } from '@/lib/email-service';

export async function POST(request: Request) {
	try {
		const user = await getUser();
		if (!user) {
			return Response.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const membership = await getUserOrganisation();
		if (!membership) {
			return Response.json({ error: 'No organisation found' }, { status: 403 });
		}

		const body = await request.json();
		const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure } = body as {
			smtp_host?: string;
			smtp_port?: number;
			smtp_user?: string;
			smtp_pass?: string;
			smtp_from?: string;
			smtp_secure?: boolean;
		};

		// Resolve password: use body value if provided, otherwise fall back to decrypted org value
		const org = membership.organisations;
		const resolvedPass = smtp_pass?.trim() || org.smtp_pass || '';
		const resolvedHost = smtp_host?.trim() || org.smtp_host || '';
		const resolvedUser = smtp_user?.trim() || org.smtp_user || '';
		const resolvedFrom = smtp_from?.trim() || org.smtp_from || '';
		const resolvedPort = smtp_port ?? org.smtp_port ?? 587;
		const resolvedSecure = smtp_secure ?? org.smtp_secure ?? false;

		if (!resolvedHost || !resolvedUser || !resolvedPass || !resolvedFrom) {
			return Response.json({ error: 'SMTP configuration is incomplete' }, { status: 400 });
		}

		const smtpConfig: SmtpConfig = {
			host: resolvedHost,
			port: resolvedPort,
			user: resolvedUser,
			pass: resolvedPass,
			from: resolvedFrom,
			secure: resolvedSecure,
		};

		const recipientEmail = user.email;
		if (!recipientEmail) {
			return Response.json({ error: 'User has no email address' }, { status: 400 });
		}

		await sendEmail(
			{
				to: recipientEmail,
				subject: 'SMTP Test Email',
				html: '<p>This is a test email to verify your SMTP configuration is working correctly.</p>',
				text: 'This is a test email to verify your SMTP configuration is working correctly.',
			},
			smtpConfig
		);

		return Response.json({ success: true });
	} catch (error) {
		console.error('Error sending test email:', error);
		return Response.json(
			{ error: error instanceof Error ? error.message : 'Failed to send test email' },
			{ status: 500 }
		);
	}
}
