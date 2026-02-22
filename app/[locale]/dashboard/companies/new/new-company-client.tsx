'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm } from '@/components/crud/crud-form';
import type { CrudFormField } from '@/components/crud/crud-form';
import { companiesService } from '@/lib/companies-service';
import type { Company } from '@/lib/types';

interface NewCompanyClientProps {
	organisationId: string;
}

export function NewCompanyClient({ organisationId }: NewCompanyClientProps) {
	const tCompanies = useTranslations('companies');
	const _tCommon = useTranslations('common');
	const router = useRouter();
	const [isSaving, setIsSaving] = useState(false);

	const handleSubmit = async (formData: any) => {
		setIsSaving(true);

		try {
			const companyData = {
				...formData,
				organisation_id: organisationId,
			};

			// Debug: Log what we're about to send
			console.log('Form data received:', formData);
			console.log('Company data to be sent:', companyData);

			const createdCompany = await companiesService.createCompany(companyData);

			toast.success(tCompanies('createdSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});

			// Redirect to company edit page after a short delay
			setTimeout(() => {
				router.push(`/dashboard/companies/${createdCompany.id}`);
			}, 1500);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tCompanies('createFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		} finally {
			setIsSaving(false);
		}
	};

	const fields: CrudFormField[] = [
		{
			name: 'name',
			label: tCompanies('name'),
			type: 'text',
			required: true,
			placeholder: tCompanies('namePlaceholder'),
		},
		{
			name: 'description',
			label: tCompanies('description'),
			type: 'textarea',
			required: false,
			placeholder: tCompanies('descriptionPlaceholder'),
		},
		{
			name: 'legal_name',
			label: tCompanies('legalName'),
			type: 'text',
			required: true,
			placeholder: tCompanies('legalNamePlaceholder'),
		},
		{
			name: 'legal_form',
			label: tCompanies('legalForm'),
			type: 'text',
			required: true,
			placeholder: tCompanies('legalFormPlaceholder'),
		},
		{
			name: 'industry',
			label: tCompanies('industry'),
			type: 'text',
			required: true,
			placeholder: tCompanies('industryPlaceholder'),
		},
		{
			name: 'street_and_number',
			label: tCompanies('streetAndNumber'),
			type: 'text',
			required: true,
			placeholder: tCompanies('streetAndNumberPlaceholder'),
		},
		{
			name: 'city',
			label: tCompanies('city'),
			type: 'text',
			required: true,
			placeholder: tCompanies('cityPlaceholder'),
		},
		{
			name: 'postal_code',
			label: tCompanies('postalCode'),
			type: 'text',
			required: true,
			placeholder: tCompanies('postalCodePlaceholder'),
		},
		{
			name: 'country',
			label: tCompanies('country'),
			type: 'text',
			required: true,
			placeholder: tCompanies('countryPlaceholder'),
		},
		{
			name: 'email',
			label: tCompanies('email'),
			type: 'text',
			required: false,
			placeholder: tCompanies('emailPlaceholder'),
		},
		{
			name: 'number',
			label: tCompanies('number'),
			type: 'text',
			required: false,
			placeholder: tCompanies('numberPlaceholder'),
		},
		{
			name: 'website',
			label: tCompanies('website'),
			type: 'text',
			required: false,
			placeholder: tCompanies('websitePlaceholder'),
		},
		{
			name: 'fax',
			label: tCompanies('fax'),
			type: 'text',
			required: false,
			placeholder: tCompanies('faxPlaceholder'),
		},
		{
			name: 'tax_number',
			label: tCompanies('taxNumber'),
			type: 'text',
			required: false,
			placeholder: tCompanies('taxNumberPlaceholder'),
		},
		{
			name: 'vat_id',
			label: tCompanies('vatId'),
			type: 'text',
			required: false,
			placeholder: tCompanies('vatIdPlaceholder'),
		},
		{
			name: 'commercial_register',
			label: tCompanies('commercialRegister'),
			type: 'text',
			required: false,
			placeholder: tCompanies('commercialRegisterPlaceholder'),
		},
		{
			name: 'ceo',
			label: tCompanies('ceo'),
			type: 'text',
			required: false,
			placeholder: tCompanies('ceoPlaceholder'),
		},
	];

	// Provide default initial data with empty values
	const initialData: Partial<Company> = {
		name: '',
		description: '',
		legal_name: '',
		legal_form: '',
		industry: '',
		street_and_number: '',
		city: '',
		postal_code: '',
		country: '',
		email: '',
		number: '',
		website: '',
		fax: '',
		tax_number: '',
		vat_id: '',
		commercial_register: '',
		ceo: '',
	};

	return (
		<CrudForm
			title={tCompanies('createNewCompany')}
			description={tCompanies('createNewCompany')}
			fields={fields}
			initialData={initialData}
			onSubmit={handleSubmit}
			isLoading={false}
			isSaving={isSaving}
			backHref="/dashboard/companies"
			entityType="company"
		/>
	);
}
