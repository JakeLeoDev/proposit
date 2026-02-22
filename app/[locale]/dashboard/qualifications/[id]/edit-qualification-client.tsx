'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { qualificationsService } from '@/lib/qualifications-service';
import { categoryAutocompleteConfig } from '@/lib/autocomplete-service-configs';
import type { Qualification } from '@/lib/types';

interface EditQualificationClientProps {
	qualificationId: string;
	organisationId: string;
}

export function EditQualificationClient({
	qualificationId,
	organisationId,
}: EditQualificationClientProps) {
	const tQualifications = useTranslations('qualifications');
	const router = useRouter();
	const [qualification, setQualification] = useState<Qualification | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		const loadQualificationAndCategories = async () => {
			try {
				// Load qualification
				const qualificationData = await qualificationsService.getQualification(qualificationId);

				if (!qualificationData) {
					toast.error(tQualifications('notFound'), {
						style: {
							background: '#fef2f2',
							border: '1px solid #fecaca',
							color: '#dc2626',
						},
					});
					return;
				}

				// Ensure content is properly formatted as JSON string
				const processedData = {
					...qualificationData,
					content:
						typeof qualificationData.content === 'string'
							? qualificationData.content
							: JSON.stringify(qualificationData.content || {}),
				};

				setQualification(processedData);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : tQualifications('loadFailed'), {
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

		loadQualificationAndCategories();

		// Set up real-time subscription for this specific qualification
		const subscription = qualificationsService.subscribeToQualification(
			qualificationId,
			(payload) => {
				if (payload.eventType === 'UPDATE') {
					const processedData = {
						...payload.new,
						content:
							typeof payload.new.content === 'string'
								? payload.new.content
								: JSON.stringify(payload.new.content || {}),
					};
					setQualification(processedData);
				} else if (payload.eventType === 'DELETE') {
					toast.error(tQualifications('hasBeenDeleted'), {
						style: {
							background: '#fef2f2',
							border: '1px solid #fecaca',
							color: '#dc2626',
						},
					});
				}
			}
		);

		return () => {
			subscription.unsubscribe();
		};
	}, [qualificationId, organisationId]);

	const handleSubmit = async (data: Partial<Qualification>) => {
		setIsSaving(true);

		try {
			await qualificationsService.updateQualification(qualificationId, {
				name: data.name || '',
				description: data.description || '',
				content: data.content || '{}',
				category: data.category || '',
			});

			toast.success(tQualifications('updatedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tQualifications('updateFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		setIsDeleting(true);

		try {
			await qualificationsService.deleteQualification(qualificationId);
			toast.success(tQualifications('deletedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
			router.push('/dashboard/qualifications');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tQualifications('deleteFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
			setIsDeleting(false);
		}
	};

	const handleSaveSuccess = (data: Partial<Qualification>) => {
		// Update the qualification state with the saved data
		setQualification((prev) => (prev ? { ...prev, ...data } : null));
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

	return (
		<CrudForm
			title={tQualifications('edit')}
			description={tQualifications('editQualification')}
			fields={fields}
			initialData={qualification || {}}
			onSubmit={handleSubmit}
			onDelete={handleDelete}
			onSaveSuccess={handleSaveSuccess}
			isLoading={isLoading}
			isSaving={isSaving}
			isDeleting={isDeleting}
			backHref="/dashboard/qualifications"
			entityType="qualification"
			entityId={qualificationId}
			organisationId={organisationId}
		/>
	);
}
