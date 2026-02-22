'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import type { UserPromptTemplate } from '@/lib/types';
import { userPromptTemplatesService } from '@/lib/user-prompt-templates-service';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function PromptTemplatesClient() {
	const t = useTranslations('promptTemplates');
	const router = useRouter();
	const [templates, setTemplates] = useState<UserPromptTemplate[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [userId, setUserId] = useState<string | null>(null);

	useEffect(() => {
		const loadData = async () => {
			try {
				const supabase = createClient();
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) {
					router.push('/auth/login');
					return;
				}
				setUserId(user.id);

				const data = await userPromptTemplatesService.getPromptTemplates(user.id);
				setTemplates(data);
			} catch (e: unknown) {
				const errorMessage = e instanceof Error ? e.message : 'Failed to load prompt templates';
				setError(errorMessage);
				toast.error(errorMessage);
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [router]);

	// Subscribe to real-time updates when userId is available
	useEffect(() => {
		if (!userId) return;

		const subscription = userPromptTemplatesService.subscribeToPromptTemplates(userId, (payload) => {
			if (payload.eventType === 'INSERT') {
				setTemplates((prev) => [payload.new, ...prev]);
			} else if (payload.eventType === 'UPDATE') {
				setTemplates((prev) => prev.map((t) => (t.id === payload.new.id ? payload.new : t)));
			} else if (payload.eventType === 'DELETE') {
				setTemplates((prev) => prev.filter((t) => t.id !== payload.old.id));
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [userId]);

	const handleCreate = () => {
		router.push('/dashboard/ai-assistant/prompts/new');
	};

	const handleDelete = async (template: UserPromptTemplate) => {
		try {
			await userPromptTemplatesService.deletePromptTemplate(template.id);
			setTemplates((prev) => prev.filter((t) => t.id !== template.id));
			toast.success(t('deletedSuccessfully'));
		} catch (e: unknown) {
			const errorMessage = e instanceof Error ? e.message : 'Failed to delete prompt template';
			toast.error(errorMessage);
		}
	};

	const columns: DataTableColumn<UserPromptTemplate>[] = [
		{
			key: 'name',
			label: t('name'),
			render: (value, _item) => <div className="font-medium">{value}</div>,
		},
		{
			key: 'text',
			label: t('text'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground truncate max-w-md">{value}</div>
			),
		},
		{
			key: 'created_at',
			label: t('created'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground">{new Date(value).toLocaleDateString()}</div>
			),
		},
	];

	return (
		<div className="container mx-auto p-6">
			<DataTable
				title={t('title')}
				description={t('description')}
				data={templates}
				columns={columns}
				isLoading={isLoading}
				error={error}
				onCreate={handleCreate}
				onDelete={handleDelete}
				createButtonText={t('createPromptTemplate')}
				emptyMessage={t('noPrompts')}
				hrefPrefix="/dashboard/ai-assistant/prompts"
				searchKey="name"
				searchPlaceholder={t('searchPrompts')}
			/>
		</div>
	);
}
