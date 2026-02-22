'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { userPromptTemplatesService } from '@/lib/user-prompt-templates-service';
import type { UserPromptTemplate } from '@/lib/types';

interface EditPromptTemplateClientProps {
	templateId: string;
}

export function EditPromptTemplateClient({ templateId }: EditPromptTemplateClientProps) {
	const t = useTranslations('promptTemplates');
	const router = useRouter();
	const [template, setTemplate] = useState<UserPromptTemplate | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const loadTemplate = async () => {
			try {
				const data = await userPromptTemplatesService.getPromptTemplate(templateId);
				if (!data) {
					setError('Prompt template not found');
					return;
				}
				setTemplate(data);
			} catch (e: unknown) {
				const errorMessage = e instanceof Error ? e.message : 'Failed to load prompt template';
				setError(errorMessage);
				toast.error(errorMessage);
			} finally {
				setIsLoading(false);
			}
		};

		loadTemplate();
	}, [templateId]);

	const handleSubmit = async (data: Partial<UserPromptTemplate>) => {
		try {
			setIsSaving(true);
			await userPromptTemplatesService.updatePromptTemplate(templateId, {
				name: data.name || '',
				text: data.text || '',
			});

			toast.success(t('updatedSuccessfully'));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('updateFailed'));
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		try {
			await userPromptTemplatesService.deletePromptTemplate(templateId);
			toast.success(t('deletedSuccessfully'));
			router.push('/dashboard/ai-assistant/prompts');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('deleteFailed'));
		}
	};

	const fields: CrudFormField[] = [
		{
			name: 'name',
			label: t('name'),
			type: 'text',
			required: true,
			placeholder: t('namePlaceholder'),
		},
		{
			name: 'text',
			label: t('text'),
			type: 'textarea',
			required: true,
			placeholder: t('textPlaceholder'),
		},
	];

	if (isLoading) {
		return (
			<div className="container mx-auto p-6">
				<div className="text-center py-8">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (error || !template) {
		return (
			<div className="container mx-auto p-6">
				<div className="text-center py-8">
					<p className="text-muted-foreground">{error || 'Prompt template not found'}</p>
				</div>
			</div>
		);
	}

	return (
		<CrudForm
			title={t('editPromptTemplate')}
			description={t('editDescription')}
			fields={fields}
			initialData={template}
			onSubmit={handleSubmit}
			onDelete={handleDelete}
			isLoading={isLoading}
			isSaving={isSaving}
			backHref="/dashboard/ai-assistant/prompts"
			entityType="promptTemplate"
			entityId={templateId}
		/>
	);
}
