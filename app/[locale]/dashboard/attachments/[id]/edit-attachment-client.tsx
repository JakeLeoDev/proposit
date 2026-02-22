'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { useAttachmentsStore } from '@/lib/stores/attachments.store';
import type { Attachment } from '@/lib/types';

interface EditAttachmentClientProps {
	attachmentId: string;
	organisationId: string;
}

export function EditAttachmentClient({ attachmentId }: EditAttachmentClientProps) {
	const tAttachments = useTranslations('attachments');
	const router = useRouter();
	const store = useAttachmentsStore();
	const attachment = useAttachmentsStore((s) => s.itemById[attachmentId]);
	const isLoading = useAttachmentsStore((s) => s.isLoading);
	const isSaving = useAttachmentsStore((s) => s.isSaving);

	useEffect(() => {
		store.fetchOne(attachmentId);
	}, [attachmentId]); // Removed store from dependencies

	const handleSubmit = async (data: Partial<Attachment>) => {
		try {
			await store.update(attachmentId, {
				name: data.name || '',
				description: data.description || '',
				content: data.content || '{}',
			});

			toast.success(tAttachments('updatedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tAttachments('updateFailed'), {
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
			await store.remove(attachmentId);
			toast.success(tAttachments('deletedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
			router.push('/dashboard/attachments');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tAttachments('deleteFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		}
	};

	const handleSaveSuccess = (_data: Partial<Attachment>) => {
		// Data is automatically synced via store
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

	// Ensure content is properly formatted as JSON string
	const processedAttachment = attachment
		? {
				...attachment,
				content:
					typeof attachment.content === 'string'
						? attachment.content
						: JSON.stringify(attachment.content || {}),
			}
		: null;

	return (
		<CrudForm
			title={tAttachments('edit')}
			description={tAttachments('editAttachment')}
			fields={fields}
			initialData={processedAttachment || {}}
			onSubmit={handleSubmit}
			onDelete={handleDelete}
			onSaveSuccess={handleSaveSuccess}
			isLoading={isLoading}
			isSaving={isSaving}
			isDeleting={false}
			backHref="/dashboard/attachments"
			entityType="attachment"
			entityId={attachmentId}
		/>
	);
}
