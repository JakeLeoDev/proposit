'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { Badge } from '@/components/ui/badge';
import type { Company } from '@/lib/types';
import { useCompaniesStore } from '@/lib/stores/companies.store';
import { usePersonsStore } from '@/lib/stores/persons.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';

export function CompaniesClient() {
	const t = useTranslations('navigation');
	const tCompanies = useTranslations('companies');
	const _tCommon = useTranslations('common');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const store = useCompaniesStore();
	const companies = useCompaniesStore((s) => s.items);
	const isLoading = useCompaniesStore((s) => s.isLoading);
	const error = useCompaniesStore((s) => s.error ?? null);
	const personsStore = usePersonsStore();
	const persons = usePersonsStore((s) => s.items);

	useEffect(() => {
		if (organisationId) {
			store.fetchAll(organisationId);
			const unsubscribeCompanies = store.startRealtime(organisationId);
			personsStore.fetchAll(organisationId);
			const unsubscribePersons = personsStore.startRealtime(organisationId);

			return () => {
				const r1 = unsubscribeCompanies();
				void r1;
				const r2 = unsubscribePersons();
				void r2;
			};
		}
	}, [organisationId]); // Removed store from dependencies

	const handleCreate = () => {
		router.push('/dashboard/companies/new');
	};

	const handleDelete = async (company: Company) => {
		// Persons list is independent; we keep current persons state, company removal handled by store
		await store.remove(company.id);
	};

	// Helper function to get persons count for a company
	const getPersonsCount = (companyId: string) => {
		return persons.filter((person) => person.company_id === companyId).length;
	};

	const columns: DataTableColumn<Company>[] = [
		{
			key: 'name',
			label: tCompanies('name'),
			render: (value, _item) => (
				<div>
					<div className="font-medium">{value}</div>
					<div className="text-sm text-muted-foreground">{_item.legal_name}</div>
				</div>
			),
		},
		{
			key: 'industry',
			label: tCompanies('industry'),
			render: (value, _item) => (
				<Badge variant="secondary" className="text-xs">
					{value}
				</Badge>
			),
		},
		{
			key: 'email',
			label: tCompanies('email'),
			render: (value, _item) => <div className="text-sm text-muted-foreground">{value || '-'}</div>,
		},
		{
			key: 'persons',
			label: tCompanies('persons'),
			render: (value, item) => {
				const count = getPersonsCount(item.id);
				return (
					<div className="text-sm">
						{count > 0 ? (
							<Badge variant="outline">{tCompanies('personsCount', { count })}</Badge>
						) : (
							<span className="text-muted-foreground">0</span>
						)}
					</div>
				);
			},
		},
		{
			key: 'created_at',
			label: tCompanies('created'),
			render: (value, _item) => (
				<div className="text-sm text-muted-foreground">{new Date(value).toLocaleDateString()}</div>
			),
		},
	];

	return (
		<div className="container mx-auto p-6">
			<DataTable
				title={t('companies')}
				description={tCompanies('manageCompanies')}
				data={companies}
				columns={columns}
				isLoading={isLoading}
				error={error}
				onCreate={handleCreate}
				onDelete={handleDelete}
				createButtonText={tCompanies('createCompany')}
				emptyMessage={tCompanies('noCompanies')}
				hrefPrefix="/dashboard/companies"
				searchKey="name"
				searchPlaceholder={tCompanies('searchCompanies')}
			/>
		</div>
	);
}
