'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmailProposalDialogProps {
	proposalId: string;
	recipientEmail: string;
	emailEnabled: boolean;
}

export function EmailProposalDialog({
	proposalId,
	recipientEmail,
	emailEnabled,
}: EmailProposalDialogProps) {
	const t = useTranslations('proposals.email');
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState(recipientEmail);
	const [message, setMessage] = useState('');
	const [isSending, setIsSending] = useState(false);

	const handleSend = async () => {
		if (!email.trim()) {
			toast.error(t('recipientEmailRequired'));
			return;
		}

		setIsSending(true);
		try {
			const res = await fetch('/api/email/send-proposal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					proposalId,
					recipientEmail: email.trim(),
					message: message.trim() || undefined,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || t('sendError'));
			}

			toast.success(t('sent'));
			setOpen(false);
			setMessage('');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t('sendError'));
		} finally {
			setIsSending(false);
		}
	};

	const trigger = (
		<Button type="button" size="sm" variant="outline" disabled={!emailEnabled}>
			<Mail className="w-4 h-4 mr-2" />
			{t('sendByEmail')}
		</Button>
	);

	return (
		<TooltipProvider>
			<Dialog open={open} onOpenChange={setOpen}>
				<Tooltip>
					<TooltipTrigger asChild>
						{emailEnabled ? <DialogTrigger asChild>{trigger}</DialogTrigger> : <span>{trigger}</span>}
					</TooltipTrigger>
					{!emailEnabled && (
						<TooltipContent>
							<p>{t('smtpNotConfigured')}</p>
						</TooltipContent>
					)}
				</Tooltip>

				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t('dialogTitle')}</DialogTitle>
						<DialogDescription>{t('dialogDescription')}</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="recipient-email">{t('recipientEmail')}</Label>
							<Input
								id="recipient-email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={t('recipientEmailPlaceholder')}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="personal-message">
								{t('personalMessage')}{' '}
								<span className="text-muted-foreground font-normal">({t('optional')})</span>
							</Label>
							<Textarea
								id="personal-message"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder={t('personalMessagePlaceholder')}
								rows={4}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
							{t('cancel')}
						</Button>
						<Button onClick={handleSend} disabled={isSending}>
							{isSending ? (
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							) : (
								<Mail className="w-4 h-4 mr-2" />
							)}
							{isSending ? t('sending') : t('send')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
