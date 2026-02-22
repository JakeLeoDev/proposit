'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { useCertificatesStore } from '@/lib/stores/certificates.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';
import { categoryAutocompleteConfig } from '@/lib/autocomplete-service-configs';
import type { Certificate } from '@/lib/types';

export function EditCertificateClient({ certificateId }: { certificateId: string }) {
	const tCertificates = useTranslations('certificates');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const store = useCertificatesStore();
	const certificate = useCertificatesStore((s) => s.itemById[certificateId]);
	const isLoading = useCertificatesStore((s) => s.isLoading);
	const isSaving = useCertificatesStore((s) => s.isSaving);

	useEffect(() => {
		store.fetchOne(certificateId);
	}, [certificateId, organisationId]); // Removed store from dependencies

	const handleSubmit = async (data: Partial<Certificate>) => {
		try {
			await store.update(certificateId, {
				name: data.name || '',
				description: data.description || '',
				content: data.content || '{}',
				category: data.category || '',
			});

			toast.success(tCertificates('updatedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tCertificates('updateFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		}
	};

	const handleDelete = async () => {
		try {
			await store.remove(certificateId);
			toast.success(tCertificates('deletedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
			router.push('/dashboard/certificates');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tCertificates('deleteFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		}
	};

	const handleSaveSuccess = (_data: Partial<Certificate>) => {
		// Data is automatically synced via store
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

	// Ensure content is properly formatted as JSON string
	const processedCertificate = certificate
		? {
				...certificate,
				content:
					typeof certificate.content === 'string'
						? certificate.content
						: JSON.stringify(certificate.content || {}),
			}
		: null;

	return (
		<CrudForm
			title={tCertificates('edit')}
			description={tCertificates('editCertificate')}
			fields={fields}
			initialData={processedCertificate || {}}
			onSubmit={handleSubmit}
			onDelete={handleDelete}
			onSaveSuccess={handleSaveSuccess}
			isLoading={isLoading}
			isSaving={isSaving}
			isDeleting={false}
			backHref="/dashboard/certificates"
			entityType="certificate"
			entityId={certificateId}
			organisationId={organisationId ?? undefined}
		/>
	);
}
