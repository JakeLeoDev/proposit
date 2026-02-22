'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import type { Qualification } from '@/lib/types';
import { useQualificationsStore } from '@/lib/stores/qualifications.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';

export function QualificationsClient() {
	const t = useTranslations('navigation');
	const tQualifications = useTranslations('qualifications');
	const _tCommon = useTranslations('common');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const store = useQualificationsStore();
	const qualifications = useQualificationsStore((s) => s.items);
	const isLoading = useQualificationsStore((s) => s.isLoading);
	const error = useQualificationsStore((s) => s.error ?? null);

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
		router.push('/dashboard/qualifications/new');
	};

	const handleDelete = async (qualification: Qualification) => {
		await store.remove(qualification.id);
	};

	const columns: DataTableColumn<Qualification>[] = [
		{
			key: 'name',
			label: tQualifications('name'),
			render: (value, _item) => <div className="font-medium">{value}</div>,
		},
		{
			key: 'description',
			label: tQualifications('description'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground truncate max-w-xs">{value}</div>
			),
		},
		{
			key: 'created_at',
			label: tQualifications('created'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground">{new Date(value).toLocaleDateString()}</div>
			),
		},
	];

	return (
		<div className="container mx-auto p-6">
			<DataTable
				title={t('qualifications')}
				description={tQualifications('manageQualifications')}
				data={qualifications}
				columns={columns}
				isLoading={isLoading}
				error={error}
				onCreate={handleCreate}
				onDelete={handleDelete}
				createButtonText={tQualifications('createQualification')}
				emptyMessage={tQualifications('noQualifications')}
				hrefPrefix="/dashboard/qualifications"
				searchKey="name"
				searchPlaceholder={tQualifications('searchQualifications')}
			/>
		</div>
	);
}
