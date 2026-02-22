import { getUser, getUserOrganisation } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail, isEmailConfigured, type SmtpConfig } from '@/lib/email-service';
import { buildProposalEmail } from '@/lib/email-templates/proposal';

export async function POST(request: Request) {
	try {
		const user = await getUser();
		if (!user) {
			return Response.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { proposalId, recipientEmail, message } = body as {
			proposalId: string;
			recipientEmail: string;
			message?: string;
		};

		if (!proposalId || !recipientEmail) {
			return Response.json({ error: 'proposalId and recipientEmail are required' }, { status: 400 });
		}

		// Load org with decrypted SMTP fields
		const membership = await getUserOrganisation();
		if (!membership) {
			return Response.json({ error: 'No organisation found' }, { status: 403 });
		}

		const org = membership.organisations;

		// Determine SMTP config: org custom SMTP takes priority over global env
		let smtpConfig: SmtpConfig | undefined;
		if (org.smtp_enabled && org.smtp_host && org.smtp_user && org.smtp_pass && org.smtp_from) {
			smtpConfig = {
				host: org.smtp_host,
				port: org.smtp_port ?? 587,
				user: org.smtp_user,
				pass: org.smtp_pass,
				from: org.smtp_from,
				secure: org.smtp_secure ?? false,
			};
		} else if (!isEmailConfigured()) {
			return Response.json({ error: 'Email is not configured' }, { status: 503 });
		}

		const serviceClient = createServiceClient();

		// Fetch proposal with organisation name and recipient info
		const { data: proposal, error: proposalError } = await serviceClient
			.from('proposals')
			.select('id, name, proposal_number, expiry_date, organisation_id, recipient')
			.eq('id', proposalId)
			.eq('organisation_id', membership.organisation_id)
			.single();

		if (proposalError || !proposal) {
			return Response.json({ error: 'Proposal not found' }, { status: 404 });
		}

		const { data: organisation } = await serviceClient
			.from('organisations')
			.select('name')
			.eq('id', proposal.organisation_id)
			.single();

		const { data: recipient } = await serviceClient
			.from('persons')
			.select('first_name, last_name, title')
			.eq('id', proposal.recipient)
			.single();

		// Get or create the shareable link
		const { data: existingLink } = await serviceClient
			.from('links')
			.select('*')
			.eq('proposal_id', proposalId)
			.maybeSingle();

		let token: string;
		if (existingLink) {
			token = existingLink.token;
		} else {
			const newToken = crypto.randomUUID();
			const expDate = new Date();
			expDate.setDate(expDate.getDate() + 30);

			const { data: newLink, error: linkError } = await serviceClient
				.from('links')
				.insert({
					proposal_id: proposalId,
					organisation_id: proposal.organisation_id,
					token: newToken,
					exp_date: expDate.toISOString().split('T')[0],
				})
				.select()
				.single();

			if (linkError || !newLink) {
				return Response.json({ error: 'Failed to create proposal link' }, { status: 500 });
			}
			token = newLink.token;
		}

		const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
		const proposalUrl = `${baseUrl}/proposals/${proposalId}?token=${token}`;

		const recipientName = recipient
			? [recipient.title, recipient.first_name, recipient.last_name].filter(Boolean).join(' ')
			: recipientEmail;

		const expiryDate = new Date(proposal.expiry_date).toLocaleDateString('de-DE');

		const { subject, html, text } = buildProposalEmail({
			organisationName: organisation?.name ?? '',
			proposalName: proposal.name,
			proposalNumber: proposal.proposal_number,
			recipientName,
			proposalUrl,
			expiryDate,
			personalMessage: message,
		});

		await sendEmail({ to: recipientEmail, subject, html, text }, smtpConfig);

		return Response.json({ success: true });
	} catch (error) {
		console.error('Error sending proposal email:', error);
		return Response.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
}
