'use client';

import { createContext, useContext, type ReactNode, useMemo } from 'react';
import type {
	Proposal,
	Company,
	Person,
	Organisation,
	Qualification,
	Certificate,
	Attachment,
	User,
	ProductCollection,
	ProductItem,
} from '@/lib/types';

export interface ProposalRelations {
	proposal: Proposal;
	company: Company | null;
	recipient: Person | null;
	organisation: Organisation | null;
	qualification?: Qualification | null;
	certificate?: Certificate | null;
	attachment?: Attachment | null;
	preparator: User | null;
	productCollections?: (ProductCollection & { items: ProductItem[] })[];
}

interface ProposalContextValue {
	data: ProposalRelations | null;
	isLoading: boolean;
	error: string | null;
	token?: string | null;
}

const ProposalContext = createContext<ProposalContextValue | undefined>(undefined);

export function ProposalProvider({
	initialData,
	children,
	token,
}: {
	initialData: ProposalRelations | null;
	children: ReactNode;
	token?: string | null;
}) {
	const value: ProposalContextValue = useMemo(
		() => ({
			data: initialData,
			isLoading: false,
			error: initialData ? null : 'Failed to load proposal data',
			token,
		}),
		[initialData, token]
	);
	return <ProposalContext.Provider value={value}>{children}</ProposalContext.Provider>;
}

export function useProposalContext(): ProposalContextValue {
	const ctx = useContext(ProposalContext);
	if (!ctx) throw new Error('useProposalContext must be used within ProposalProvider');
	return ctx;
}

// Selectors
export function getProposalTitle(rel: ProposalRelations | null): string {
	return rel?.proposal.name || 'Proposal';
}

export function getRecipientInfo(rel: ProposalRelations | null): string {
	if (!rel) return 'Recipient';
	const person = rel.recipient;
	const company = rel.company;
	if (person && company)
		return (
			[person.title, person.first_name, person.last_name].filter(Boolean).join(' ').trim() +
			` (${company.name})`
		);
	if (person)
		return (
			[person.title, person.first_name, person.last_name].filter(Boolean).join(' ').trim() ||
			'Recipient'
		);
	if (company) return company.name;
	return 'Recipient';
}

export function getValidUntilFormatted(rel: ProposalRelations | null): string {
	const d = rel?.proposal.expiry_date;
	if (!d) return '';
	return new Date(d).toLocaleDateString('de-DE', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	});
}

export function getProductCollectionById(
	rel: ProposalRelations | null,
	collectionId: string
): (ProductCollection & { items: ProductItem[] }) | null {
	if (!rel?.productCollections) return null;
	return rel.productCollections.find((c) => c.id === collectionId) || null;
}
