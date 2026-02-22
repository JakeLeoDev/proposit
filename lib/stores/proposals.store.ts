import { createEntityStore } from './create-entity-store';
import { proposalsService } from '@/lib/proposals-service';
import type { Proposal } from '@/lib/types';

type ProposalInput = Omit<Proposal, 'id' | 'created_at'>;

export const useProposalsStore = createEntityStore<Proposal>((set, get) => ({
	async fetchAll(organisationId: string) {
		set({ isLoading: true, error: null });
		try {
			const list = await proposalsService.getProposals(organisationId);
			set({
				items: list,
				itemById: list.reduce(
					(acc, item) => {
						acc[item.id] = item;
						return acc;
					},
					{} as Record<string, Proposal>
				),
				isLoading: false,
				error: null,
			});
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load proposals' });
			throw e;
		}
	},
	async fetchOne(id: string) {
		set({ isLoading: true, error: null });
		try {
			const item = await proposalsService.getProposal(id);
			if (item) {
				set((state) => ({
					itemById: { ...state.itemById, [item.id]: item },
					items: (state.items as Proposal[]).some((i: Proposal) => i.id === item.id)
						? (state.items as Proposal[]).map((i: Proposal) => (i.id === item.id ? item : i))
						: [item, ...state.items],
					isLoading: false,
				}));
			} else {
				set({ isLoading: false });
			}
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load proposal' });
			throw e;
		}
	},
	async create(input: ProposalInput) {
		set({ isSaving: true, error: null });
		try {
			const created = await proposalsService.createProposal(input);
			set((state) => ({
				items: [created, ...(state.items as Proposal[])],
				itemById: { ...(state.itemById as Record<string, Proposal>), [created.id]: created },
				isSaving: false,
			}));
			return created;
		} catch (e) {
			set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to create proposal' });
			throw e;
		}
	},
	async update(id: string, updates: Partial<Proposal>) {
		set({ isSaving: true, error: null });
		const previous = get().itemById[id];
		if (previous) {
			const optimistic = { ...previous, ...updates } as Proposal;
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Proposal>), [id]: optimistic },
				items: (state.items as Proposal[]).map((i: Proposal) => (i.id === id ? optimistic : i)),
			}));
		}
		try {
			const updated = await proposalsService.updateProposal(id, updates);
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Proposal>), [id]: updated },
				items: (state.items as Proposal[]).map((i: Proposal) => (i.id === id ? updated : i)),
				isSaving: false,
			}));
			return updated;
		} catch (e) {
			if (previous) {
				set((state) => ({
					itemById: { ...(state.itemById as Record<string, Proposal>), [id]: previous },
					items: (state.items as Proposal[]).map((i: Proposal) => (i.id === id ? previous : i)),
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update proposal',
				}));
			} else {
				set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to update proposal' });
			}
			throw e;
		}
	},
	async remove(id: string) {
		const prev = get().itemById[id];
		set((state) => ({
			items: (state.items as Proposal[]).filter((i: Proposal) => i.id !== id),
			itemById: Object.fromEntries(
				Object.entries(state.itemById as Record<string, Proposal>).filter(([k]) => k !== id)
			) as Record<string, Proposal>,
		}));
		try {
			await proposalsService.deleteProposal(id);
		} catch (e) {
			if (prev) {
				set((state) => ({
					items: [prev, ...(state.items as Proposal[])],
					itemById: { ...(state.itemById as Record<string, Proposal>), [prev.id]: prev },
					error: e instanceof Error ? e.message : 'Failed to delete proposal',
				}));
			}
			throw e;
		}
	},
	startRealtime(organisationId: string) {
		const subscription = proposalsService.subscribeToProposals(organisationId, (payload) => {
			if (payload.eventType === 'INSERT') {
				set((state) => ({
					items: [payload.new as Proposal, ...(state.items as Proposal[])],
					itemById: {
						...(state.itemById as Record<string, Proposal>),
						[(payload.new as Proposal).id]: payload.new as Proposal,
					},
				}));
			} else if (payload.eventType === 'UPDATE') {
				set((state) => ({
					items: (state.items as Proposal[]).map((i: Proposal) =>
						i.id === (payload.new as Proposal).id ? (payload.new as Proposal) : i
					),
					itemById: {
						...(state.itemById as Record<string, Proposal>),
						[(payload.new as Proposal).id]: payload.new as Proposal,
					},
				}));
			} else if (payload.eventType === 'DELETE') {
				set((state) => ({
					items: (state.items as Proposal[]).filter(
						(i: Proposal) => i.id !== (payload.old as Proposal).id
					),
					itemById: Object.fromEntries(
						Object.entries(state.itemById as Record<string, Proposal>).filter(
							([k]) => k !== (payload.old as Proposal).id
						)
					) as Record<string, Proposal>,
				}));
			}
		});
		return () => {
			void subscription.unsubscribe();
		};
	},
}));
