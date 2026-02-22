'use client';

import { useTranslations } from 'next-intl';
import { useProposalContext } from '@/components/viewer/contexts/ProposalContext';
import { cn } from '@/lib/utils';

interface SignaturePageProps {
	hideFooter?: boolean;
}

export default function SignaturePage({ hideFooter = false }: SignaturePageProps) {
	const t = useTranslations('viewer');
	const { data } = useProposalContext();

	// Get recipient (person who receives the proposal)
	const recipient = data?.recipient;
	const company = data?.company;

	// Get preparator (user who created the proposal)
	const preparator = data?.preparator;
	const organisation = data?.organisation;

	// Format recipient name
	const recipientName = recipient
		? [recipient.title, recipient.first_name, recipient.last_name].filter(Boolean).join(' ').trim()
		: '';

	// Format company name for recipient
	const recipientCompany = company?.name || '';

	// Format preparator name
	const preparatorName = preparator
		? [preparator.first_name, preparator.last_name].filter(Boolean).join(' ').trim()
		: '';

	return (
		<div>
			<div className={cn('px-3 py-2')}>
				{/* Title */}
				<div className="mb-12">
					<h1 className="text-3xl font-bold text-black">{t('signature')}</h1>
				</div>

				{/* Signature fields for recipient */}
				<div className="space-y-8 mb-16">
					<div>
						<h2 className="text-xl font-semibold mb-6 text-black">{t('client')}</h2>
						<div className="space-y-6">
							<div className="border-b-2 border-neutral-900 pt-2 min-h-[60px]">
								<div className="text-xs text-neutral-600 mb-1">{t('name')}</div>
								<div className="text-base text-black">
									{recipientCompany ? `${recipientName} (${recipientCompany})` : recipientName}
								</div>
							</div>

							<div className="flex gap-x-6">
								<div className="flex-1 border-b-2 border-neutral-900 pt-2 min-h-[60px]">
									<div className="text-xs text-neutral-600 mb-1">{t('date')}</div>
									<div className="text-base text-black"></div>
								</div>

								<div className="flex-1 border-b-2 border-neutral-900 pt-2 min-h-[60px]">
									<div className="text-xs text-neutral-600 mb-1">{t('location')}</div>
									<div className="text-base text-black"></div>
								</div>
							</div>

							<div className="border-b-2 border-neutral-900 pt-2 min-h-[80px]">
								<div className="text-xs text-neutral-600 mb-1">{t('signature')}</div>
							</div>
						</div>
					</div>
				</div>

				{/* Signature fields for preparator/organisation */}
				<div className="space-y-8">
					<div>
						<h2 className="text-xl font-semibold mb-6 text-black">{t('contractor')}</h2>
						<div className="space-y-6">
							<div className="border-b-2 border-neutral-900 pt-2 min-h-[60px]">
								<div className="text-xs text-neutral-600 mb-1">{t('name')}</div>
								<div className="text-base text-black">
									{organisation?.name ? `${preparatorName} (${organisation.name})` : preparatorName}
								</div>
							</div>

							<div className="flex gap-x-6">
								<div className="flex-1 border-b-2 border-neutral-900 pt-2 min-h-[60px]">
									<div className="text-xs text-neutral-600 mb-1">{t('date')}</div>
									<div className="text-base text-black"></div>
								</div>

								<div className="flex-1 border-b-2 border-neutral-900 pt-2 min-h-[60px]">
									<div className="text-xs text-neutral-600 mb-1">{t('location')}</div>
									<div className="text-base text-black"></div>
								</div>
							</div>

							<div className="border-b-2 border-neutral-900 pt-2 min-h-[80px]">
								<div className="text-xs text-neutral-600 mb-1">{t('signature')}</div>
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				{!hideFooter && data?.organisation?.footer && (
					<div className="mt-8 pt-4 border-t">
						<div className="text-xs text-neutral-500 text-center">{data.organisation.footer}</div>
					</div>
				)}
			</div>
		</div>
	);
}
