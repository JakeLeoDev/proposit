'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { qualificationsService } from '@/lib/qualifications-service';
import { categoryAutocompleteConfig } from '@/lib/autocomplete-service-configs';
import type { Qualification } from '@/lib/types';

interface NewQualificationClientProps {
	organisationId: string;
}

export function NewQualificationClient({ organisationId }: NewQualificationClientProps) {
	const tQualifications = useTranslations('qualifications');
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (data: Partial<Qualification>) => {
		setIsLoading(true);

		try {
			await qualificationsService.createQualification({
				name: data.name || '',
				description: data.description || '',
				content: data.content || '{}', // Provide default JSON string
				category: data.category || '',
				organisation_id: organisationId,
			});

			toast.success(tQualifications('createdSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});

			// Redirect to qualifications list after a short delay
			setTimeout(() => {
				router.push('/dashboard/qualifications');
			}, 1500);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tQualifications('createFailed'), {
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
			label: tQualifications('name'),
			type: 'text',
			required: true,
			placeholder: `Enter ${tQualifications('name').toLowerCase()}`,
		},
		{
			name: 'description',
			label: tQualifications('description'),
			type: 'textarea',
			required: true,
			placeholder: `Enter ${tQualifications('description').toLowerCase()}`,
		},
		{
			name: 'category',
			label: tQualifications('category'),
			type: 'autocomplete',
			required: true,
			autocompleteService: categoryAutocompleteConfig,
			placeholder: tQualifications('selectCategory'),
		},
		{
			name: 'content',
			label: tQualifications('content'),
			type: 'richtext',
			required: true,
			component: RichTextEditor,
		},
	];

	// Provide default initial data with empty content
	const initialData: Partial<Qualification> = {
		name: '',
		description: '',
		category: '',
		content: '', // Default empty JSON object
	};

	return (
		<CrudForm
			title={tQualifications('create')}
			description={tQualifications('createNewQualification')}
			fields={fields}
			initialData={initialData}
			onSubmit={handleSubmit}
			isLoading={false}
			isSaving={isLoading}
			backHref="/dashboard/qualifications"
			entityType="qualification"
			organisationId={organisationId}
		/>
	);
}
