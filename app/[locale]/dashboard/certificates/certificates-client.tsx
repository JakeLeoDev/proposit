'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import type { Certificate } from '@/lib/types';
import { useCertificatesStore } from '@/lib/stores/certificates.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';

export function CertificatesClient() {
	const t = useTranslations('navigation');
	const tCertificates = useTranslations('certificates');
	const _tCommon = useTranslations('common');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const store = useCertificatesStore();
	const certificates = useCertificatesStore((s) => s.items);
	const isLoading = useCertificatesStore((s) => s.isLoading);
	const error = useCertificatesStore((s) => s.error ?? null);

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
		router.push('/dashboard/certificates/new');
	};

	const handleDelete = async (certificate: Certificate) => {
		await store.remove(certificate.id);
	};

	const columns: DataTableColumn<Certificate>[] = [
		{
			key: 'name',
			label: tCertificates('name'),
			render: (value, _item) => <div className="font-medium">{value}</div>,
		},
		{
			key: 'description',
			label: tCertificates('description'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground truncate max-w-xs">{value}</div>
			),
		},
		{
			key: 'created_at',
			label: tCertificates('created'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground">{new Date(value).toLocaleDateString()}</div>
			),
		},
	];

	return (
		<div className="container mx-auto p-6">
			<DataTable
				title={t('certificates')}
				description={tCertificates('manageCertificates')}
				data={certificates}
				columns={columns}
				isLoading={isLoading}
				error={error}
				onCreate={handleCreate}
				onDelete={handleDelete}
				createButtonText={tCertificates('createCertificate')}
				emptyMessage={tCertificates('noCertificates')}
				hrefPrefix="/dashboard/certificates"
				searchKey="name"
				searchPlaceholder={tCertificates('searchCertificates')}
			/>
		</div>
	);
}
