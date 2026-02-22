'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { proposalsService } from '@/lib/proposals-service';
import {
	companyAutocompleteConfig,
	personAutocompleteConfig,
} from '@/lib/autocomplete-service-configs';
import type { Proposal } from '@/lib/types';

interface NewProposalClientProps {
	organisationId: string;
	userId: string;
}

export function NewProposalClient({ organisationId, userId }: NewProposalClientProps) {
	const t = useTranslations('proposals');
	const router = useRouter();
	const [isSaving, setIsSaving] = useState(false);

	const handleSubmit = async (data: Record<string, unknown>) => {
		setIsSaving(true);
		try {
			// Company and recipient are now already IDs (handled by CrudForm dependency resolution)

			// Create default Lexical editor state
			const defaultContent = {
				root: {
					children: [
						{
							children: [],
							direction: null,
							format: '',
							indent: 0,
							type: 'paragraph',
							version: 1,
							textFormat: 0,
							textStyle: '',
						},
					],
					direction: null,
					format: '',
					indent: 0,
					type: 'root',
					version: 1,
				},
			};

			// Set expiry date to 2 weeks from now
			const expiryDate = new Date();
			expiryDate.setDate(expiryDate.getDate() + 14);
			const expiryDateString = expiryDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

			const createdProposal = await proposalsService.createProposal({
				name: data.name || '',
				internal_name: data.internal_name || null,
				organisation_id: organisationId,
				status: 'Draft',
				preparator: userId,
				company: data.company as string,
				recipient: data.recipient as string,
				content: defaultContent,
				expiry_date: expiryDateString,
			} as Omit<Proposal, 'id' | 'created_at'>);

			toast.success(t('createdSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});

			// Redirect to proposal edit page after a short delay
			setTimeout(() => {
				router.push(`/dashboard/proposals/${createdProposal.id}`);
			}, 1500);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('createFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		} finally {
			setIsSaving(false);
		}
	};

	const fields: CrudFormField[] = useMemo(
		() => [
			{
				name: 'name',
				label: t('name'),
				type: 'text',
				required: true,
				placeholder: `Enter ${t('name').toLowerCase()}`,
			},
			{
				name: 'internal_name',
				label: t('internalName'),
				type: 'text',
				required: false,
				placeholder: `Enter ${t('internalName').toLowerCase()}`,
			},
			{
				name: 'company',
				label: t('company'),
				type: 'autocomplete',
				required: true,
				autocompleteService: companyAutocompleteConfig,
				placeholder: t('selectOrCreateCompany'),
			},
			{
				name: 'recipient',
				label: t('recipient'),
				type: 'autocomplete',
				required: true,
				autocompleteService: personAutocompleteConfig,
				dependsOn: ['company'], // Recipient creation requires company ID
				placeholder: t('selectOrCreateRecipient'),
			},
		],
		[t]
	);

	const initialData = useMemo(
		() => ({
			name: '',
			internal_name: '',
			company: '',
			recipient: '',
		}),
		[]
	);

	return (
		<CrudForm
			title={t('create')}
			description={t('createNewProposal')}
			fields={fields}
			initialData={initialData}
			onSubmit={handleSubmit}
			isSaving={isSaving}
			backHref="/dashboard/proposals"
			entityType="proposal"
			organisationId={organisationId}
		/>
	);
}
