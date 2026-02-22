'use client';

import { useTranslations } from 'next-intl';
import { useProposalContext } from '@/components/viewer/contexts/ProposalContext';
import { cn } from '@/lib/utils';
import { AuthenticatedImg } from '@/components/ui/authenticated-image';

interface TitlePageProps {
	disablePageClass?: boolean;
	hideFooter?: boolean;
}

export default function TitlePage({
	disablePageClass = false,
	hideFooter = false,
}: TitlePageProps) {
	const t = useTranslations('viewer');
	const { data, token } = useProposalContext();
	const proposal = data?.proposal;
	const recipient = data?.recipient;
	const company = data?.company;
	const organisation = data?.organisation;
	const preparator = data?.preparator;

	const created = proposal?.created_at ? new Date(proposal.created_at) : null;
	const validUntil = proposal?.expiry_date ? new Date(proposal.expiry_date) : null;
	const proposalNo = proposal?.proposal_number
		? String(proposal.proposal_number).padStart(3, '0')
		: '000';

	return (
		<div
			className={cn(
				'relative bg-[#FFFFFF]',
				!disablePageClass && 'page w-[800px] aspect-[1/1.4142] drop-shadow-3xl',
				disablePageClass && 'aspect-auto drop-shadow-none h-full'
			)}
			id="title-page-print"
		>
			<div className={cn('flex flex-col h-full', !disablePageClass && 'pt-16 pl-12 pr-12 pb-12')}>
				{/* Company Logo */}
				{organisation?.logo && (
					<div className="flex justify-start">
						<div className="w-auto h-[10rem] flex items-center justify-center">
							{proposal?.id ? (
								<img
									src={`/api/proposals/${proposal.id}/images/${organisation.logo}${token ? `?token=${encodeURIComponent(token)}` : ''}`}
									alt={`${organisation.name} Logo`}
									className="max-w-full max-h-full object-contain"
								/>
							) : (
								<AuthenticatedImg
									src={`Media/${organisation.logo}`}
									alt={`${organisation.name} Logo`}
									className="max-w-full max-h-full object-contain"
								/>
							)}
						</div>
					</div>
				)}

				{/* Proposal Title */}
				<div
					className="mb-4 text-left border-l-6 pl-4 mt-16"
					style={{
						borderColor: organisation?.color || 'var(--color-primary)',
					}}
				>
					<div className="flex items-center gap-3 mb-2">
						<h1
							className="!text-4xl !font-bold font-display !mb-0"
							style={{
								color: organisation?.color || 'var(--color-primary)',
							}}
						>
							{t('proposalTitle')}
						</h1>
					</div>
					<h1 className="!text-2xl !font-medium !text-[#101827] !mb-0">
						{proposal?.name || t('proposal')}
					</h1>
				</div>

				{proposal?.proposal_number && (
					<div className="text-lg font-medium text-neutral-600 mb-2">
						{t('proposalNo', { number: proposalNo })}
					</div>
				)}

				{/* Recipient and Sender Information */}
				<div className="flex-1 flex flex-col gap-y-16 mt-24">
					{/* Recipient Block */}
					<div>
						<h5 className="!text-2xl !font-medium text-neutral-900 !mb-2 font-display">{t('to')}</h5>
						<div className="">
							{recipient ? (
								<div className="space-y-2">
									<div className="font-semibold">
										{[recipient.title, recipient.first_name, recipient.last_name].filter(Boolean).join(' ')}
									</div>
									{company && (
										<div className="space-y-1.5">
											<div className="text-neutral-700 font-medium">
												{company.name}
												{company.legal_name && company.legal_name !== company.name && ` ${company.legal_name}`}
											</div>
											<div className="flex flex-col">
												{company.number && <div className="text-neutral-700 text-sm">{company.number}</div>}
												{company.email && <div className="text-neutral-700 text-sm">{company.email}</div>}
											</div>
											<div className="flex flex-col">
												{company.street_and_number && (
													<div className="text-neutral-700 text-sm">{company.street_and_number}</div>
												)}
												{(company.postal_code || company.city) && (
													<div className="text-neutral-700 text-sm">
														{company.postal_code} {company.city}
													</div>
												)}
												{company.country && <div className="text-neutral-700 text-sm">{company.country}</div>}
											</div>
										</div>
									)}
								</div>
							) : (
								<div className="text-neutral-600">{t('recipientLabel')}</div>
							)}
						</div>
					</div>

					{/* Sender Block */}
					<div>
						<h5 className="!text-2xl font-display !font-medium !mb-2 text-neutral-900">{t('from')}</h5>
						<div className="">
							{preparator ? (
								<div className="space-y-2">
									<div className="font-semibold">
										{[preparator.first_name, preparator.last_name].filter(Boolean).join(' ')}
									</div>
									{organisation && (
										<div className="space-y-1.5">
											<div className="text-neutral-700 font-medium">{organisation.name}</div>
											<div className="flex flex-col">
												{organisation.street_and_number && (
													<div className="text-neutral-700 text-sm">{organisation.street_and_number}</div>
												)}
												{(organisation.postal_code || organisation.city) && (
													<div className="text-neutral-700 text-sm">
														{organisation.postal_code} {organisation.city}
													</div>
												)}
												{organisation.country && (
													<div className="text-neutral-700 text-sm">{organisation.country}</div>
												)}
											</div>
										</div>
									)}
								</div>
							) : (
								<div className="text-neutral-600">{t('senderLabel')}</div>
							)}
						</div>
					</div>
				</div>

				{/* Date Information */}
				<div className="mt-8 text-right text-sm text-neutral-600">
					{created && <div>{t('createdOn', { date: created.toLocaleDateString('de-DE') })}</div>}
					{validUntil && (
						<div className="mt-1">
							{t('validUntil', { date: validUntil.toLocaleDateString('de-DE') })}
						</div>
					)}
				</div>

				{/* Footer */}
				{!hideFooter && organisation?.footer && (
					<div className="mt-8 text-center text-xs text-neutral-500 border-t pt-4">
						{organisation.footer}
					</div>
				)}
			</div>
		</div>
	);
}
