import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

export interface SmtpConfig {
	host: string;
	port: number;
	user: string;
	pass: string;
	from: string;
	secure: boolean;
}

let defaultTransporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
	return !!(
		process.env.SMTP_HOST &&
		process.env.SMTP_PORT &&
		process.env.SMTP_USER &&
		process.env.SMTP_PASS &&
		process.env.SMTP_FROM
	);
}

function createTransporter(config?: SmtpConfig): Transporter {
	if (config) {
		return nodemailer.createTransport({
			host: config.host,
			port: config.port,
			secure: config.secure,
			auth: {
				user: config.user,
				pass: config.pass,
			},
		});
	}

	if (!defaultTransporter) {
		defaultTransporter = nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: Number(process.env.SMTP_PORT),
			secure: process.env.SMTP_SECURE === 'true',
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		});
	}
	return defaultTransporter;
}

export async function sendEmail(options: SendEmailOptions, smtpConfig?: SmtpConfig): Promise<void> {
	if (!smtpConfig && !isEmailConfigured()) {
		throw new Error('SMTP is not configured');
	}

	const transporter = createTransporter(smtpConfig);
	const from = smtpConfig ? smtpConfig.from : process.env.SMTP_FROM;

	await transporter.sendMail({
		from,
		to: options.to,
		subject: options.subject,
		html: options.html,
		text: options.text,
	});
}
