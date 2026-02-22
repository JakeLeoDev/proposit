'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import type { Attachment } from '@/lib/types';
import { useAttachmentsStore } from '@/lib/stores/attachments.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';

export function AttachmentsClient() {
	const t = useTranslations('navigation');
	const tAttachments = useTranslations('attachments');
	const _tCommon = useTranslations('common');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const store = useAttachmentsStore();
	const attachments = useAttachmentsStore((s) => s.items);
	const isLoading = useAttachmentsStore((s) => s.isLoading);
	const error = useAttachmentsStore((s) => s.error ?? null);

	useEffect(() => {
		if (organisationId) {
			store.fetchAll(organisationId);
			const unsubscribe = store.startRealtime(organisationId);
			return () => {
				const r = unsubscribe();
				void r;
			};
		}
	}, [organisationId]); // Removed store from dependencies

	const handleCreate = () => {
		router.push('/dashboard/attachments/new');
	};

	const handleDelete = async (attachment: Attachment) => {
		await store.remove(attachment.id);
	};

	const columns: DataTableColumn<Attachment>[] = [
		{
			key: 'name',
			label: tAttachments('name'),
			render: (value, _item) => <div className="font-medium">{value}</div>,
		},
		{
			key: 'description',
			label: tAttachments('description'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground truncate max-w-xs">{value}</div>
			),
		},
		{
			key: 'created_at',
			label: tAttachments('created'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground">{new Date(value).toLocaleDateString()}</div>
			),
		},
	];

	return (
		<div className="container mx-auto p-6">
			<DataTable
				title={t('attachments')}
				description={tAttachments('manageAttachments')}
				data={attachments}
				columns={columns}
				isLoading={isLoading}
				error={error}
				onCreate={handleCreate}
				onDelete={handleDelete}
				createButtonText={tAttachments('createAttachment')}
				emptyMessage={tAttachments('noAttachments')}
				hrefPrefix="/dashboard/attachments"
				searchKey="name"
				searchPlaceholder={tAttachments('searchAttachments')}
			/>
		</div>
	);
}
