'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { userPromptTemplatesService } from '@/lib/user-prompt-templates-service';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import type { UserPromptTemplate } from '@/lib/types';

export function NewPromptTemplateClient() {
	const t = useTranslations('promptTemplates');
	const router = useRouter();
	const [isSaving, setIsSaving] = useState(false);

	const handleSubmit = async (data: Partial<UserPromptTemplate>) => {
		try {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				toast.error('User not authenticated');
				return;
			}

			setIsSaving(true);
			await userPromptTemplatesService.createPromptTemplate({
				user_id: user.id,
				name: data.name || '',
				text: data.text || '',
			});

			toast.success(t('createdSuccessfully'));

			// Redirect to prompts list after a short delay
			setTimeout(() => {
				router.push('/dashboard/ai-assistant/prompts');
			}, 1500);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('createFailed'));
		} finally {
			setIsSaving(false);
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

	const initialData: Partial<UserPromptTemplate> = {
		name: '',
		text: '',
	};

	return (
		<CrudForm
			title={t('createPromptTemplate')}
			description={t('createDescription')}
			fields={fields}
			initialData={initialData}
			onSubmit={handleSubmit}
			isLoading={false}
			isSaving={isSaving}
			backHref="/dashboard/ai-assistant/prompts"
			entityType="promptTemplate"
		/>
	);
}
