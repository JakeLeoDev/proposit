'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CrudForm } from '@/components/crud/crud-form';
import type { CrudFormField } from '@/components/crud/crud-form';
import { Button } from '@/components/ui/button';
import { companiesService } from '@/lib/companies-service';
import { personsService } from '@/lib/persons-service';
import type { Person, Company } from '@/lib/types';

interface EditPersonClientProps {
	personId: string;
	companyId: string;
	organisationId: string;
}

export function EditPersonClient({
	personId,
	companyId,
	organisationId: _organisationId,
}: EditPersonClientProps) {
	const tPersons = useTranslations('persons');
	const tCompanies = useTranslations('companies');
	const router = useRouter();
	const [person, setPerson] = useState<Person | null>(null);
	const [company, setCompany] = useState<Company | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		const loadData = async () => {
			try {
				const [personData, companyData] = await Promise.all([
					personsService.getPerson(personId),
					companiesService.getCompany(companyId),
				]);

				if (!personData) {
					toast.error(tPersons('notFound'));
					router.push(`/dashboard/companies/${companyId}`);
					return;
				}

				if (!companyData) {
					toast.error(tCompanies('notFound'));
					router.push('/dashboard/companies');
					return;
				}

				setPerson(personData);
				setCompany(companyData);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : tPersons('loadFailed'));
				router.push(`/dashboard/companies/${companyId}`);
			} finally {
				setIsLoading(false);
			}
		};

		loadData();

		// Set up real-time subscription
		const subscription = personsService.subscribeToPerson(personId, (payload) => {
			if (payload.eventType === 'UPDATE') {
				setPerson(payload.new as Person);
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [personId, companyId, router]);

	const handleSubmit = async (formData: any) => {
		setIsSaving(true);

		try {
			await personsService.updatePerson(personId, formData);

			toast.success(tPersons('updatedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tPersons('updateFailed'), {
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
		if (!person) return;

		setIsDeleting(true);

		try {
			await personsService.deletePerson(person.id);

			toast.success(tPersons('deletedSuccessfully'), {
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
			toast.error(err instanceof Error ? err.message : tPersons('deleteFailed'), {
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

	if (!person || !company) {
		return (
			<div className="container mx-auto p-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-neutral-900">Contact person not found</h1>
					<p className="text-neutral-600 mt-2">
						The contact person you&apos;re looking for doesn&apos;t exist.
					</p>
					<Button onClick={() => router.push(`/dashboard/companies/${companyId}`)} className="mt-4">
						Back to Company
					</Button>
				</div>
			</div>
		);
	}

	return (
		<CrudForm
			title={`${tPersons('editPerson')} - ${[person.title, person.first_name, person.last_name].filter(Boolean).join(' ')}`}
			description={`${tPersons('editPerson')} for ${company.name}`}
			fields={fields}
			initialData={person}
			onSubmit={handleSubmit}
			onDelete={handleDelete}
			isLoading={isLoading}
			isSaving={isSaving}
			isDeleting={isDeleting}
			backHref={`/dashboard/companies/${companyId}`}
			entityType="person"
		/>
	);
}
