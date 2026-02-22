'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm } from '@/components/crud/crud-form';
import type { CrudFormField } from '@/components/crud/crud-form';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, User } from 'lucide-react';
import { companiesService } from '@/lib/companies-service';
import { personsService } from '@/lib/persons-service';
import type { Company, Person } from '@/lib/types';

interface EditCompanyClientProps {
	companyId: string;
	organisationId: string;
}

export function EditCompanyClient({
	companyId,
	organisationId: _organisationId,
}: EditCompanyClientProps) {
	const tCompanies = useTranslations('companies');
	const tPersons = useTranslations('persons');
	const _tCommon = useTranslations('common');
	const router = useRouter();
	const [company, setCompany] = useState<Company | null>(null);
	const [persons, setPersons] = useState<Person[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		const loadData = async () => {
			try {
				const [companyData, personsData] = await Promise.all([
					companiesService.getCompany(companyId),
					personsService.getPersonsByCompany(companyId),
				]);

				if (!companyData) {
					toast.error(tCompanies('notFound'));
					return;
				}

				setCompany(companyData);
				setPersons(personsData);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : tCompanies('loadFailed'));
			} finally {
				setIsLoading(false);
			}
		};

		loadData();

		// Set up real-time subscriptions
		const companySubscription = companiesService.subscribeToCompany(companyId, (payload) => {
			if (payload.eventType === 'UPDATE') {
				setCompany(payload.new as Company);
			}
		});

		const personsSubscription = personsService.subscribeToPersonsByCompany(companyId, (payload) => {
			if (payload.eventType === 'INSERT') {
				setPersons((prev) => {
					const newPerson = payload.new as Person;
					const exists = prev.some((p) => p.id === newPerson.id);
					return exists ? prev : [newPerson, ...prev];
				});
			} else if (payload.eventType === 'UPDATE') {
				const updated = payload.new as Person;
				setPersons((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
			}
		});

		return () => {
			companySubscription.unsubscribe();
			personsSubscription.unsubscribe();
		};
	}, [companyId]);

	const handleSubmit = async (formData: any) => {
		setIsSaving(true);

		try {
			await companiesService.updateCompany(companyId, formData);

			toast.success(tCompanies('updatedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tCompanies('updateFailed'), {
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

	const handleDelete = async () => {
		if (!company) return;

		setIsDeleting(true);

		try {
			await companiesService.deleteCompany(company.id);

			toast.success(tCompanies('deletedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});

			// Redirect to companies list after a short delay
			setTimeout(() => {
				router.push('/dashboard/companies');
			}, 1500);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tCompanies('deleteFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		} finally {
			setIsDeleting(false);
		}
	};

	const handleDeletePerson = async (person: Person) => {
		try {
			// Optimistically update UI first
			setPersons((prev) => prev.filter((p) => p.id !== person.id));

			await personsService.deletePerson(person.id);

			toast.success(tPersons('deletedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
		} catch (err) {
			// Revert the optimistic update on error
			const personsData = await personsService.getPersonsByCompany(companyId);
			setPersons(personsData);

			toast.error(err instanceof Error ? err.message : tPersons('deleteFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
		}
	};

	const handleAddPerson = () => {
		// Navigate to create person page with company context
		router.push(`/dashboard/companies/${companyId}/persons/new`);
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

	const personsColumns: DataTableColumn<Person>[] = [
		{
			key: 'fullName',
			label: tPersons('fullName'),
			render: (value, item) => (
				<div className="flex items-center gap-2">
					<User className="w-4 h-4 text-muted-foreground" />
					<div>
						<div className="font-medium">
							{[item.title, item.first_name, item.last_name].filter(Boolean).join(' ')}
						</div>
						{item.position && <div className="text-sm text-muted-foreground">{item.position}</div>}
					</div>
				</div>
			),
		},
		{
			key: 'email',
			label: tPersons('email'),
			render: (value, _item) => <div className="text-sm text-muted-foreground">{value || '-'}</div>,
		},
		{
			key: 'number',
			label: tPersons('number'),
			render: (value, _item) => <div className="text-sm text-muted-foreground">{value || '-'}</div>,
		},
	];

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
					<h1 className="text-2xl font-bold text-neutral-900">Company not found</h1>
					<p className="text-neutral-600 mt-2">
						The company you&apos;re looking for doesn&apos;t exist.
					</p>
					<Button onClick={() => router.push('/dashboard/companies')} className="mt-4">
						Back to Companies
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div className="flex-1">
				<CrudForm
					title={tCompanies('editCompany')}
					description={tCompanies('editCompany')}
					fields={fields}
					initialData={company}
					onSubmit={handleSubmit}
					onDelete={handleDelete}
					isLoading={isLoading}
					isSaving={isSaving}
					isDeleting={isDeleting}
					backHref="/dashboard/companies"
					entityType="company"
				/>
			</div>

			{/* Contact Persons Section */}
			<div className="container mx-auto p-6">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<User className="w-5 h-5" />
									{tCompanies('persons')}
								</CardTitle>
								<CardDescription>Manage contact persons for {company.name}</CardDescription>
							</div>
							<Button onClick={handleAddPerson} size="sm">
								<Plus className="w-4 h-4 mr-2" />
								{tCompanies('addPerson')}
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{persons.length > 0 ? (
							<DataTable<Person>
								data={persons}
								columns={personsColumns}
								title=""
								isLoading={false}
								error={null}
								onDelete={handleDeletePerson}
								emptyMessage={tCompanies('noPersons')}
								hrefPrefix={`/dashboard/companies/${companyId}/persons`}
								searchKey="first_name"
								searchPlaceholder="Search persons..."
							/>
						) : (
							<div className="text-center py-8">
								<User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
								<p className="text-muted-foreground mb-4">{tCompanies('noPersons')}</p>
								<Button onClick={handleAddPerson} variant="outline">
									<Plus className="w-4 h-4 mr-2" />
									{tCompanies('addPerson')}
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
