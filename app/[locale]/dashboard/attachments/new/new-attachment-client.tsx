'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { useAttachmentsStore } from '@/lib/stores/attachments.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';
import type { Attachment } from '@/lib/types';

export function NewAttachmentClient() {
	const tAttachments = useTranslations('attachments');
	const tCommon = useTranslations('common');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const store = useAttachmentsStore();
	const isSaving = useAttachmentsStore((s) => s.isSaving);

	const handleSubmit = async (data: Partial<Attachment>) => {
		if (!organisationId) {
			toast.error(tCommon('organisationIdNotAvailable'));
			return;
		}

		try {
			await store.create({
				name: data.name || '',
				description: data.description || '',
				content: data.content || '{}',
				organisation_id: organisationId,
			});

			toast.success(tAttachments('createdSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});

			// Redirect to attachments list after a short delay
			setTimeout(() => {
				router.push('/dashboard/attachments');
			}, 1500);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tAttachments('createFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		}
	};

	const fields: CrudFormField[] = [
		{
			name: 'name',
			label: tAttachments('name'),
			type: 'text',
			required: true,
			placeholder: `Enter ${tAttachments('name').toLowerCase()}`,
		},
		{
			name: 'description',
			label: tAttachments('description'),
			type: 'textarea',
			required: true,
			placeholder: `Enter ${tAttachments('description').toLowerCase()}`,
		},
		{
			name: 'content',
			label: tAttachments('content'),
			type: 'richtext',
			required: true,
			component: RichTextEditor,
		},
	];

	// Provide default initial data with empty content
	const initialData: Partial<Attachment> = {
		name: '',
		description: '',
		content: '', // Default empty JSON object
	};

	return (
		<CrudForm
			title={tAttachments('create')}
			description={tAttachments('createNewAttachment')}
			fields={fields}
			initialData={initialData}
			onSubmit={handleSubmit}
			isLoading={false}
			isSaving={isSaving}
			backHref="/dashboard/attachments"
			entityType="attachment"
		/>
	);
}
