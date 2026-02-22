'use client';

import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useProposalContext } from '@/components/viewer/contexts/ProposalContext';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

type DownloadState = 'idle' | 'loading' | 'success' | 'error';

interface ErrorInfo {
	message: string;
	details?: string;
}

export default function PDFDownloadButton() {
	const params = useParams<{ id: string; locale: string }>();
	const searchParams = useSearchParams();
	const { data } = useProposalContext();
	const t = useTranslations('viewer');
	const [downloadState, setDownloadState] = useState<DownloadState>('idle');
	const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

	const handleClick = async () => {
		const id = data?.proposal.id || params.id;
		const locale = params.locale;
		if (!id || !locale) return;

		setDownloadState('loading');
		setErrorInfo(null); // Clear previous error when retrying

		try {
			const supabase = createClient();
			const {
				data: { session },
			} = await supabase.auth.getSession();

			const headers: HeadersInit = {};
			let url = `/api/proposals/${id}/pdf?locale=${locale}`;

			// Check if we're in preview mode
			const preview = searchParams.get('preview');

			if (session?.access_token) {
				// User is authenticated - use Authorization header
				headers['Authorization'] = `Bearer ${session.access_token}`;
				// Add preview parameter if in preview mode
				if (preview === 'true') {
					url += `&preview=${preview}`;
				}
			} else {
				// User is not authenticated - check for token in URL
				const token = searchParams.get('token');
				if (token) {
					url += `&token=${token}`;
				}
			}

			const res = await fetch(url, { headers });
			if (!res.ok) {
				throw new Error(`PDF generation failed: ${res.status} ${res.statusText}`);
			}

			const blob = await res.blob();
			const urlObj = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = urlObj;

			// Use proposal number for filename if available, otherwise fallback to ID
			const proposalNumber = data?.proposal.proposal_number;
			const filename = proposalNumber ? `Angebot Nr. ${proposalNumber}.pdf` : `proposal-${id}.pdf`;
			a.download = filename;

			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(urlObj);

			setDownloadState('success');
			toast.success(t('pdf.downloaded'));
		} catch (error) {
			setDownloadState('error');
			const errorMessage = error instanceof Error ? error.message : t('pdf.downloadFailed');

			let errorDetails = '';
			if (error instanceof Error) {
				if (error.message.includes('Failed to fetch')) {
					errorDetails = t('pdf.networkError');
				} else if (error.message.includes('404')) {
					errorDetails = t('pdf.notFound');
				} else if (error.message.includes('403')) {
					errorDetails = t('pdf.unauthorized');
				} else if (error.message.includes('500')) {
					errorDetails = t('pdf.serverError');
				} else {
					errorDetails = error.message;
				}
			}

			setErrorInfo({
				message: t('pdf.downloadFailed'),
				details: errorDetails,
			});

			toast.error(errorMessage);
		}
	};

	const getButtonContent = () => {
		switch (downloadState) {
			case 'loading':
				return (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						{t('pdf.generating')}
					</>
				);
			case 'success':
				return (
					<>
						<CheckCircle className="mr-2 h-4 w-4 text-success-light-foreground" />
						{t('pdf.downloadedLabel')}
					</>
				);
			case 'error':
				return (
					<>
						<XCircle className="mr-2 h-4 w-4" />
						{t('pdf.errorOccurred')}
					</>
				);
			default:
				return (
					<>
						<Download className="mr-2 h-4 w-4" />
						{t('pdf.download')}
					</>
				);
		}
	};

	const getButtonVariant = () => {
		switch (downloadState) {
			case 'success':
				return 'default';
			case 'error':
				return 'destructive';
			default:
				return 'outline';
		}
	};

	const getButtonClassName = () => {
		const baseClass = 'w-full transition-all duration-200';
		if (downloadState === 'success') {
			return `${baseClass} bg-success-light hover:bg-success text-success-light-foreground border-success-border`;
		}
		return baseClass;
	};

	return (
		<div className="p-4 border-t">
			<Button
				className={getButtonClassName()}
				variant={getButtonVariant()}
				onClick={handleClick}
				disabled={downloadState === 'loading'}
			>
				{getButtonContent()}
			</Button>
			{errorInfo && errorInfo.details && (
				<div className="mt-2 text-sm text-error-dark">{errorInfo.details}</div>
			)}
		</div>
	);
}
