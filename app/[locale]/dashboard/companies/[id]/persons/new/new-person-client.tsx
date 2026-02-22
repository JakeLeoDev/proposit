'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm } from '@/components/crud/crud-form';
import type { CrudFormField } from '@/components/crud/crud-form';
import { useCompaniesStore } from '@/lib/stores/companies.store';
import { usePersonsStore } from '@/lib/stores/persons.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';
import type { Person } from '@/lib/types';

interface NewPersonClientProps {
	companyId: string;
}

export function NewPersonClient({ companyId }: NewPersonClientProps) {
	const tPersons = useTranslations('persons');
	const tCommon = useTranslations('common');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const companiesStore = useCompaniesStore();
	const personsStore = usePersonsStore();
	const company = useCompaniesStore((s) => s.itemById[companyId]);
	const isLoading = useCompaniesStore((s) => s.isLoading);
	const isSaving = usePersonsStore((s) => s.isSaving);

	useEffect(() => {
		companiesStore.fetchOne(companyId);
	}, [companyId]); // Removed store from dependencies

	const handleSubmit = async (formData: any) => {
		if (!organisationId) {
			toast.error(tCommon('organisationIdNotAvailable'));
			return;
		}

		try {
			const personData = {
				...formData,
				company_id: companyId,
				organisation_id: organisationId,
			};

			await personsStore.create(personData);

			toast.success(tPersons('createdSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});

			// Redirect to company edit page after a short delay
			setTimeout(() => {
				router.push(`/dashboard/companies/${companyId}`);
			}, 1500);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tPersons('createFailed'), {
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
			name: 'first_name',
			label: tPersons('firstName'),
			type: 'text',
			required: true,
			placeholder: tPersons('firstNamePlaceholder'),
		},
		{
			name: 'last_name',
			label: tPersons('lastName'),
			type: 'text',
			required: true,
			placeholder: tPersons('lastNamePlaceholder'),
		},
		{
			name: 'title',
			label: tPersons('title'),
			type: 'text',
			required: false,
			placeholder: tPersons('personTitlePlaceholder'),
		},
		{
			name: 'position',
			label: tPersons('position'),
			type: 'text',
			required: false,
			placeholder: tPersons('positionPlaceholder'),
		},
		{
			name: 'email',
			label: tPersons('email'),
			type: 'text',
			required: false,
			placeholder: tPersons('emailPlaceholder'),
		},
		{
			name: 'number',
			label: tPersons('number'),
			type: 'text',
			required: false,
			placeholder: tPersons('numberPlaceholder'),
		},
		{
			name: 'mobile_number',
			label: tPersons('mobileNumber'),
			type: 'text',
			required: false,
			placeholder: tPersons('mobileNumberPlaceholder'),
		},
	];

	// Provide default initial data with empty values
	const initialData: Partial<Person> = {
		first_name: '',
		last_name: '',
		title: '',
		position: '',
		email: '',
		number: '',
		mobile_number: '',
	};

	if (isLoading) {
		return (
			<div className="container mx-auto p-6">
				<div className="animate-pulse space-y-4">
					<div className="h-8 bg-neutral-200 rounded w-1/4"></div>
					<div className="h-4 bg-neutral-200 rounded w-1/2"></div>
					<div className="h-64 bg-neutral-200 rounded"></div>
				</div>
			</div>
		);
	}

	if (!company) {
		return (
			<div className="container mx-auto p-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">Company not found</h1>
					<button
						onClick={() => router.push('/dashboard/companies')}
						className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
					>
						Back to Companies
					</button>
				</div>
			</div>
		);
	}

	return (
		<CrudForm
			title={`${tPersons('createNewPerson')} - ${company.name}`}
			description={tPersons('createNewPerson')}
			fields={fields}
			initialData={initialData}
			onSubmit={handleSubmit}
			isLoading={false}
			isSaving={isSaving}
			backHref={`/dashboard/companies/${companyId}`}
			entityType="person"
		/>
	);
}
