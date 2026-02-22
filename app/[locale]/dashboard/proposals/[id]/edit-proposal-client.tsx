'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { type CrudFormField } from '@/components/crud/crud-form';
import { CrudModal, type CrudModalField } from '@/components/crud/crud-modal';
import { ProposalForm } from '@/components/proposals/proposal-form';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { proposalsService } from '@/lib/proposals-service';
import { companiesService } from '@/lib/companies-service';
import { qualificationsService } from '@/lib/qualifications-service';
import { certificatesService } from '@/lib/certificates-service';
import { attachmentsService } from '@/lib/attachments-service';
import { personsService } from '@/lib/persons-service';
import type { Proposal, Company, Person, User } from '@/lib/types';
import { DataTable, type DataTableColumn } from '@/components/crud/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Building2, User as UserIcon, FileText, Pencil, Sparkles } from 'lucide-react';
import { productCollectionsInstancesService } from '@/lib/product-collections-instances-service';
import type { ProductCollection } from '@/lib/types';
import { usersService } from '@/lib/users-service';
import {
	companyAutocompleteConfig,
	personAutocompleteConfig,
} from '@/lib/autocomplete-service-configs';
import StatusManagement from '@/components/viewer/molecules/StatusManagement';
import StatusBadge from '@/components/viewer/atoms/StatusBadge';
import VersionsTab from '@/components/viewer/molecules/VersionsTab';

interface EditProposalClientProps {
	proposalId: string;
	aiFeatureEnabled?: boolean;
	emailEnabled?: boolean;
}

export function EditProposalClient({
	proposalId,
	aiFeatureEnabled = false,
	emailEnabled = false,
}: EditProposalClientProps) {
	const t = useTranslations('proposals');
	const tProducts = useTranslations('products');
	const router = useRouter();
	const params = useParams();
	const locale = params.locale as string;
	const [proposal, setProposal] = useState<Proposal | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const [qualificationOptions, setQualificationOptions] = useState<
		{ value: string; label: string }[]
	>([]);
	const [certificateOptions, setCertificateOptions] = useState<{ value: string; label: string }[]>(
		[]
	);
	const [attachmentOptions, setAttachmentOptions] = useState<{ value: string; label: string }[]>([]);
	const [preparatorOptions, setPreparatorOptions] = useState<{ value: string; label: string }[]>([]);
	const [collections, setCollections] = useState<ProductCollection[]>([]);
	const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
	const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
	const [selectedPreparator, setSelectedPreparator] = useState<User | null>(null);
	const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
	const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
	const [initialFormData, setInitialFormData] = useState<Partial<Proposal> | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const p = await proposalsService.getProposal(proposalId);
				if (!p) {
					toast.error(t('notFound'), {
						style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
					});
					setIsLoading(false);
					return;
				}

				// load related options using organisation_id from proposal
				const [qualifications, certificates, attachments] = await Promise.all([
					qualificationsService.getQualifications(p.organisation_id),
					certificatesService.getCertificates(p.organisation_id),
					attachmentsService.getAttachments(p.organisation_id),
				]);

				const users = await usersService.getUsersByOrganisation(p.organisation_id);

				setQualificationOptions(qualifications.map((q) => ({ value: q.id, label: q.name })));
				setCertificateOptions(certificates.map((c) => ({ value: c.id, label: c.name })));
				setAttachmentOptions(attachments.map((a) => ({ value: a.id, label: a.name })));
				setPreparatorOptions(
					users.map((u) => ({
						value: u.id,
						label:
							`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.display_name || 'Unknown User',
					}))
				);

				const processed: Proposal = {
					...p,
					content: typeof p.content === 'string' ? p.content : JSON.stringify(p.content || {}),
				};
				setProposal(processed);

				// Load additional data for info tab
				if (processed.company) {
					const company = await companiesService.getCompany(processed.company);
					setSelectedCompany(company);
				}

				if (processed.recipient) {
					const person = await personsService.getPerson(processed.recipient);
					setSelectedPerson(person);
				}

				if (processed.preparator) {
					const preparator = await usersService.getUserProfile(processed.preparator);
					setSelectedPreparator(preparator);
				}

				// load collections for this proposal
				const colls = await productCollectionsInstancesService.getCollectionsByProposal(p.id);
				setCollections(colls);

				// Set initial form data with IDs
				setInitialFormData(processed);
			} catch (err) {
				toast.error(err instanceof Error ? err.message : t('loadFailed'), {
					style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
				});
			} finally {
				setIsLoading(false);
			}
		})();

		const sub = proposalsService.subscribeToProposal(proposalId, (payload) => {
			if (payload.eventType === 'UPDATE') {
				const processed = {
					...payload.new,
					content:
						typeof payload.new.content === 'string'
							? payload.new.content
							: JSON.stringify(payload.new.content || {}),
				};
				setProposal(processed as Proposal);
			} else if (payload.eventType === 'DELETE') {
				toast.error(t('hasBeenDeleted'), {
					style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
				});
			}
		});
		// realtime for collections
		const colSub = productCollectionsInstancesService.subscribeToCollectionsByProposal(
			proposalId,
			(payload) => {
				if (payload.eventType === 'INSERT')
					setCollections((prev) => [payload.new as ProductCollection, ...prev]);
				else if (payload.eventType === 'UPDATE')
					setCollections((prev) =>
						prev.map((c) => (c.id === payload.new.id ? (payload.new as ProductCollection) : c))
					);
				else if (payload.eventType === 'DELETE')
					setCollections((prev) => prev.filter((c) => c.id !== payload.old.id));
			}
		);
		return () => {
			sub.unsubscribe();
			colSub.unsubscribe();
		};
	}, [proposalId]);

	const handleFieldChange = async (name: string, value: unknown) => {
		// Load related entity details for info tab
		if (name === 'company') {
			const autocompleteValue = value as { id: string | null; value: string };
			if (autocompleteValue.id) {
				try {
					const company = await companiesService.getCompany(autocompleteValue.id);
					setSelectedCompany(company);
				} catch {
					setSelectedCompany(null);
				}
			} else {
				setSelectedCompany(null);
			}
		} else if (name === 'recipient') {
			const autocompleteValue = value as { id: string | null; value: string };
			if (autocompleteValue.id) {
				try {
					const person = await personsService.getPerson(autocompleteValue.id);
					setSelectedPerson(person);
				} catch {
					setSelectedPerson(null);
				}
			} else {
				setSelectedPerson(null);
			}
		} else if (name === 'preparator') {
			if (value) {
				try {
					const preparator = await usersService.getUserProfile(value as string);
					setSelectedPreparator(preparator);
				} catch {
					// Failed to load preparator - will show error in UI
				}
			} else {
				setSelectedPreparator(null);
			}
		}
	};

	const handleSubmit = async (data: Partial<Proposal>) => {
		if (!proposal) return;

		setIsSaving(true);
		try {
			// Company and recipient are now already IDs (handled by CrudForm dependency resolution)
			// Prepare update object with only changed fields
			const updateData: Partial<Omit<Proposal, 'id' | 'created_at' | 'organisation_id'>> = {
				name: data.name || '',
				internal_name: data.internal_name || null,
				proposal_number: data.proposal_number ? String(data.proposal_number) : null,
				company: data.company as string,
				recipient: data.recipient as string,
				preparator: data.preparator as string,
				qualification: (data.qualification as string) || null,
				certificate: (data.certificate as string) || null,
				attachment: (data.attachment as string) || null,
			};

			// Only update expiry_date if it's provided and not empty
			if (data.expiry_date && (data.expiry_date as string).trim()) {
				updateData.expiry_date = data.expiry_date as string;
			}

			// Only update content if it's provided
			if (data.content) {
				updateData.content = data.content;
			}

			await proposalsService.updateProposal(proposalId, updateData);

			toast.success(t('updatedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('updateFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handlePreview = () => {
		window.open(`/proposals/${proposalId}?preview=true`, '_blank');
	};

	const handleEditWithAI = () => {
		router.push(`/${locale}/dashboard/ai-assistant?proposalId=${proposalId}`);
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await proposalsService.deleteProposal(proposalId);
			toast.success(t('deletedSuccessfully'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
			router.push('/dashboard/proposals');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('deleteFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
			setIsDeleting(false);
		}
	};

	const fields: CrudFormField[] = useMemo(
		() => [
			{ name: 'name', label: t('name'), type: 'text', required: true, tab: 'general' },
			{
				name: 'internal_name',
				label: t('internalName'),
				type: 'text',
				required: false,
				tab: 'general',
			},
			{
				name: 'proposal_number',
				label: t('proposalNumber'),
				type: 'text',
				required: false,
				tab: 'general',
			},
			{ name: 'expiry_date', label: t('expiryDate'), type: 'date', required: false, tab: 'general' },
			{
				name: 'company',
				label: t('company'),
				type: 'autocomplete',
				required: true,
				autocompleteService: companyAutocompleteConfig,
				placeholder: t('selectOrCreateCompany'),
				tab: 'general',
			},
			{
				name: 'recipient',
				label: t('recipient'),
				type: 'autocomplete',
				required: true,
				autocompleteService: personAutocompleteConfig,
				dependsOn: ['company'], // Recipient creation requires company ID
				placeholder: t('selectOrCreateRecipient'),
				tab: 'general',
			},
			{
				name: 'preparator',
				label: t('preparator'),
				type: 'select',
				required: true,
				options: preparatorOptions,
				placeholder: t('selectPreparator'),
				tab: 'general',
			},
			{
				name: 'content',
				label: t('content'),
				type: 'richtext',
				required: false,
				component: RichTextEditor,
				componentProps: { proposalId, enableProductCollections: true },
				tab: 'content',
			},
			{
				name: 'qualification',
				label: t('qualification'),
				type: 'select',
				required: false,
				options: qualificationOptions,
				tab: 'content',
			},
			{
				name: 'certificate',
				label: t('certificate'),
				type: 'select',
				required: false,
				options: certificateOptions,
				tab: 'content',
			},
			{
				name: 'attachment',
				label: t('attachment'),
				type: 'select',
				required: false,
				options: attachmentOptions,
				tab: 'content',
			},
		],
		[preparatorOptions, qualificationOptions, certificateOptions, attachmentOptions, t, proposalId]
	);

	// Company modal fields
	const companyFields: CrudModalField[] = [
		{ name: 'name', label: 'Name', type: 'text', required: true },
		{ name: 'street_and_number', label: 'Straße und Hausnummer', type: 'text', required: false },
		{ name: 'city', label: 'Stadt', type: 'text', required: false },
		{ name: 'postal_code', label: 'Postleitzahl', type: 'text', required: false },
		{ name: 'email', label: 'E-Mail', type: 'text', required: false },
		{ name: 'number', label: 'Telefon', type: 'text', required: false },
	];

	// Person modal fields
	const personFields: CrudModalField[] = [
		{ name: 'title', label: 'Titel', type: 'text', required: false },
		{ name: 'first_name', label: 'Vorname', type: 'text', required: true },
		{ name: 'last_name', label: 'Nachname', type: 'text', required: true },
		{ name: 'email', label: 'E-Mail', type: 'text', required: false },
		{ name: 'number', label: 'Telefon', type: 'text', required: false },
		{ name: 'position', label: 'Position', type: 'text', required: false },
	];

	const collectionColumns: DataTableColumn<ProductCollection>[] = [
		{ key: 'name', label: t('name') },
		{
			key: 'created_at',
			label: t('created'),
			render: (value) => (
				<div className="text-sm text-muted-foreground">{new Date(value).toLocaleDateString()}</div>
			),
		},
	];

	const handleCreateCollection = () =>
		router.push(`/dashboard/proposals/${proposalId}/collections/new`);
	const handleDeleteCollection = async (collection: ProductCollection) => {
		try {
			await productCollectionsInstancesService.deleteCollection(collection.id);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('collectionDeleteFailed'));
		}
	};

	// Company modal handlers
	const handleCompanyEdit = () => {
		setIsCompanyModalOpen(true);
	};

	const handleCompanySubmit = async (data: Partial<Company>) => {
		if (!selectedCompany) throw new Error('No company selected');
		try {
			const updatedCompany = await companiesService.updateCompany(selectedCompany.id, data);
			toast.success(t('companyUpdatedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
			setIsCompanyModalOpen(false);
			return updatedCompany;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('companyUpdateFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
			throw err;
		}
	};

	// Person modal handlers
	const handlePersonEdit = () => {
		setIsPersonModalOpen(true);
	};

	const handlePersonSubmit = async (data: Partial<Person>) => {
		if (!selectedPerson) throw new Error('No person selected');
		try {
			const updatedPerson = await personsService.updatePerson(selectedPerson.id, data);
			toast.success(t('recipientUpdatedSuccessfully'), {
				style: {
					background: '#f0fdf4',
					border: '1px solid #bbf7d0',
					color: '#166534',
				},
			});
			setIsPersonModalOpen(false);
			return updatedPerson;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t('recipientUpdateFailed'), {
				style: {
					background: '#fef2f2',
					border: '1px solid #fecaca',
					color: '#dc2626',
				},
			});
			throw err;
		}
	};

	const InfoTabContent = () => (
		<div className="space-y-6">
			{/* Status Management */}
			{proposal && (
				<StatusManagement
					proposal={proposal}
					organisationId={proposal.organisation_id}
					onProposalUpdate={setProposal}
					showEmailButton={true}
					emailEnabled={emailEnabled}
					recipientEmail={selectedPerson?.email ?? ''}
				/>
			)}

			{/* Proposal Overview */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						{t('proposalOverview')}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-sm font-medium text-muted-foreground">{t('name')}</label>
							<p className="text-sm">{proposal?.name || '-'}</p>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground">{t('internalName')}</label>
							<p className="text-sm">{proposal?.internal_name || '-'}</p>
						</div>
						<div>
							<label className="text-sm font-medium text-muted-foreground">{t('proposalNumber')}</label>
							<p className="text-sm">{proposal?.proposal_number || '-'}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Company Details */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Building2 className="h-5 w-5" />
							{t('companyDetails')}
						</CardTitle>
						{selectedCompany && (
							<Button variant="outline" size="sm" onClick={handleCompanyEdit}>
								<Pencil className="h-4 w-4 mr-2" />
								Bearbeiten
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{selectedCompany ? (
						<div className="space-y-2">
							<div>
								<div className="text-sm font-medium text-muted-foreground">Name</div>
								<p className="text-sm">{selectedCompany.name}</p>
							</div>
							{selectedCompany.street_and_number && (
								<div>
									<div className="text-sm font-medium text-muted-foreground">Adresse</div>
									<p className="text-sm">
										{selectedCompany.street_and_number}, {selectedCompany.city} {selectedCompany.postal_code}
									</p>
								</div>
							)}
							{selectedCompany.email && (
								<div>
									<div className="text-sm font-medium text-muted-foreground">E-Mail</div>
									<p className="text-sm">{selectedCompany.email}</p>
								</div>
							)}
							{selectedCompany.number && (
								<div>
									<div className="text-sm font-medium text-muted-foreground">Telefon</div>
									<p className="text-sm">{selectedCompany.number}</p>
								</div>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">Kein Unternehmen ausgewählt</p>
					)}
				</CardContent>
			</Card>

			{/* Recipient Details */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<UserIcon className="h-5 w-5" />
							{t('recipientDetails')}
						</CardTitle>
						{selectedPerson && selectedCompany && (
							<Button variant="outline" size="sm" onClick={handlePersonEdit}>
								<Pencil className="h-4 w-4 mr-2" />
								Bearbeiten
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{selectedPerson ? (
						<div className="space-y-2">
							<div>
								<div className="text-sm font-medium text-muted-foreground">Name</div>
								<p className="text-sm">
									{[selectedPerson.title, selectedPerson.first_name, selectedPerson.last_name]
										.filter(Boolean)
										.join(' ')}
								</p>
							</div>
							{selectedPerson.email && (
								<div>
									<div className="text-sm font-medium text-muted-foreground">E-Mail</div>
									<p className="text-sm">{selectedPerson.email}</p>
								</div>
							)}
							{selectedPerson.number && (
								<div>
									<div className="text-sm font-medium text-muted-foreground">Telefon</div>
									<p className="text-sm">{selectedPerson.number}</p>
								</div>
							)}
							{selectedPerson.position && (
								<div>
									<div className="text-sm font-medium text-muted-foreground">Position</div>
									<p className="text-sm">{selectedPerson.position}</p>
								</div>
							)}
						</div>
					) : (
						<p className="text-sm text-muted-foreground">Kein Empfänger ausgewählt</p>
					)}
				</CardContent>
			</Card>

			{/* Preparator Details */}
			{selectedPreparator && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserIcon className="h-5 w-5" />
							Vorbereiter
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div>
								<div className="text-sm font-medium text-muted-foreground">Name</div>
								<p className="text-sm">
									{selectedPreparator.first_name && selectedPreparator.last_name
										? `${selectedPreparator.first_name} ${selectedPreparator.last_name}`
										: selectedPreparator.display_name || 'Unbekannt'}
								</p>
							</div>
							{selectedPreparator.display_name && (
								<div>
									<div className="text-sm font-medium text-muted-foreground">{t('displayName')}</div>
									<p className="text-sm">{selectedPreparator.display_name}</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);

	// Render function for Product Collections in content tab
	const renderAfterFields = (tabValue: string) => {
		if (tabValue === 'content') {
			return (
				<Card className="mt-6">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>{tProducts('productCollections')}</CardTitle>
								<CardDescription>{tProducts('manageCollectionsForProposal')}</CardDescription>
							</div>
							<Button onClick={handleCreateCollection} size="sm">
								<Plus className="w-4 h-4 mr-2" />
								{tProducts('newCollection')}
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<DataTable
							title=""
							description=""
							data={collections}
							columns={collectionColumns}
							isLoading={false}
							error={null}
							onDelete={handleDeleteCollection}
							emptyMessage={tProducts('noCollections')}
							hrefPrefix={`/dashboard/proposals/${proposalId}/collections`}
							searchKey="name"
							searchPlaceholder={tProducts('searchCollections')}
						/>
					</CardContent>
				</Card>
			);
		}
		return null;
	};

	return (
		<>
			<div className="container mx-auto py-6 px-0">
				<ProposalForm
					proposalId={proposalId}
					organisationId={proposal?.organisation_id || ''}
					initialData={initialFormData || {}}
					fields={fields}
					tabs={[
						{ value: 'general', label: t('general') },
						{ value: 'content', label: t('content') },
						{ value: 'info', label: t('info') },
						{ value: 'versions', label: t('versions') },
					]}
					onSubmit={handleSubmit}
					onDelete={handleDelete}
					onPreview={handlePreview}
					onFieldChange={handleFieldChange}
					title={
						<div className="flex items-center gap-3">
							{t('edit')}
							{proposal?.status && <StatusBadge status={proposal.status} />}
						</div>
					}
					description={t('editProposal')}
					isLoading={isLoading}
					isSaving={isSaving}
					isDeleting={isDeleting}
					customTabContent={{
						info: <InfoTabContent />,
						versions: proposal ? (
							<VersionsTab proposal={proposal} onProposalUpdate={setProposal} />
						) : null,
					}}
					renderAfterFields={renderAfterFields}
					headerActions={
						aiFeatureEnabled ? (
							<Button variant="outline" size="default" onClick={handleEditWithAI} type="button">
								<Sparkles className="h-4 w-4 mr-2" />
								{t('editWithAI')}
							</Button>
						) : undefined
					}
				/>
			</div>

			{/* Company Edit Modal */}
			{selectedCompany && (
				<CrudModal
					open={isCompanyModalOpen}
					onOpenChange={setIsCompanyModalOpen}
					mode="edit"
					title={t('editCompanyTitle')}
					description={t('editCompanyDescription', { name: selectedCompany.name })}
					fields={companyFields}
					initialData={selectedCompany}
					onSubmit={handleCompanySubmit}
					showSaveAndAddAnother={false}
					navigationHref={`/dashboard/companies/${selectedCompany.id}`}
				/>
			)}

			{/* Person Edit Modal */}
			{selectedPerson && selectedCompany && (
				<CrudModal
					open={isPersonModalOpen}
					onOpenChange={setIsPersonModalOpen}
					mode="edit"
					title={t('editRecipientTitle')}
					description={t('editRecipientDescription', {
						name: [selectedPerson.title, selectedPerson.first_name, selectedPerson.last_name]
							.filter(Boolean)
							.join(' '),
					})}
					fields={personFields}
					initialData={selectedPerson}
					onSubmit={handlePersonSubmit}
					showSaveAndAddAnother={false}
					navigationHref={`/dashboard/companies/${selectedCompany.id}/persons/${selectedPerson.id}`}
				/>
			)}
		</>
	);
}
