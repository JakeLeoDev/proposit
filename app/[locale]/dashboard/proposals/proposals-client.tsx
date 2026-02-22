'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable, type DataTableColumn } from '@/components/crud/data-table';
import StatusBadge from '@/components/viewer/atoms/StatusBadge';
import type { Proposal } from '@/lib/types';
import { useProposalsStore } from '@/lib/stores/proposals.store';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';

export function ProposalsClient() {
	const tNav = useTranslations('navigation');
	const tProposals = useTranslations('proposals');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const store = useProposalsStore();
	const proposals = useProposalsStore((s) => s.items);
	const isLoading = useProposalsStore((s) => s.isLoading);
	const error = useProposalsStore((s) => s.error ?? null);

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

	const handleCreate = () => router.push('/dashboard/proposals/new');
	const handlePreview = (proposal: Proposal) => {
		window.open(`/proposals/${proposal.id}?preview=true`, '_blank');
	};
	const handleDelete = async (proposal: Proposal) => {
		await store.remove(proposal.id);
	};

	const columns: DataTableColumn<Proposal>[] = [
		{ key: 'name', label: tProposals('name') },
		{ key: 'proposal_number', label: tProposals('proposalNumber') },
		{
			key: 'status',
			label: tProposals('status'),
			render: (value) => <StatusBadge status={value} />,
		},
		{
			key: 'created_at',
			label: tProposals('created'),
			render: (value) => (
				<div className="text-sm text-muted-foreground">{new Date(value).toLocaleDateString()}</div>
			),
		},
	];

	return (
		<div className="container mx-auto p-6">
			<DataTable
				title={tNav('proposals')}
				description={tProposals('manageProposals')}
				data={proposals}
				columns={columns}
				isLoading={isLoading}
				error={error}
				onCreate={handleCreate}
				onPreview={handlePreview}
				onDelete={handleDelete}
				createButtonText={tProposals('createProposal')}
				emptyMessage={tProposals('noProposals')}
				hrefPrefix="/dashboard/proposals"
				searchKey="name"
				searchPlaceholder={tProposals('searchProposals')}
			/>
		</div>
	);
}
