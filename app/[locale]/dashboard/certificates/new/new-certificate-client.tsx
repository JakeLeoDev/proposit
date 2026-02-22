'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { certificatesService } from '@/lib/certificates-service';
import { categoryAutocompleteConfig } from '@/lib/autocomplete-service-configs';
import type { Certificate } from '@/lib/types';

interface NewCertificateClientProps {
	organisationId: string;
}

export function NewCertificateClient({ organisationId }: NewCertificateClientProps) {
	const tCertificates = useTranslations('certificates');
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (data: Partial<Certificate>) => {
		setIsLoading(true);

		try {
			await certificatesService.createCertificate({
				name: data.name || '',
				description: data.description || '',
				content: data.content || '{}', // Provide default JSON string
				category: data.category || '',
				organisation_id: organisationId,
			});

			toast.success(tCertificates('createdSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});

			// Redirect to certificates list after a short delay
			setTimeout(() => {
				router.push('/dashboard/certificates');
			}, 1500);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tCertificates('createFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		} finally {
			setIsLoading(false);
		}
	};

	const fields: CrudFormField[] = [
		{
			name: 'name',
			label: tCertificates('name'),
			type: 'text',
			required: true,
			placeholder: `Enter ${tCertificates('name').toLowerCase()}`,
		},
		{
			name: 'description',
			label: tCertificates('description'),
			type: 'textarea',
			required: true,
			placeholder: `Enter ${tCertificates('description').toLowerCase()}`,
		},
		{
			name: 'category',
			label: tCertificates('category'),
			type: 'autocomplete',
			required: true,
			autocompleteService: categoryAutocompleteConfig,
			placeholder: tCertificates('selectCategory'),
		},
		{
			name: 'content',
			label: tCertificates('content'),
			type: 'richtext',
			required: true,
			component: RichTextEditor,
		},
	];

	// Provide default initial data with empty content
	const initialData: Partial<Certificate> = {
		name: '',
		description: '',
		category: '',
		content: '', // Default empty JSON object
	};

	return (
		<CrudForm
			title={tCertificates('create')}
			description={tCertificates('createNewCertificate')}
			fields={fields}
			initialData={initialData}
			onSubmit={handleSubmit}
			isLoading={false}
			isSaving={isLoading}
			backHref="/dashboard/certificates"
			entityType="certificate"
			organisationId={organisationId}
		/>
	);
}
