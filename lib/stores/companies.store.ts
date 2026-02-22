import { createEntityStore } from './create-entity-store';
import { companiesService } from '@/lib/companies-service';
import type { Company } from '@/lib/types';

type CompanyInput = Omit<Company, 'id' | 'created_at'>;

export const useCompaniesStore = createEntityStore<Company>((set, get) => ({
	async fetchAll(organisationId: string) {
		set({ isLoading: true, error: null });
		try {
			const list = await companiesService.getCompanies(organisationId);
			set({
				items: list,
				itemById: list.reduce(
					(acc, item) => {
						acc[item.id] = item;
						return acc;
					},
					{} as Record<string, Company>
				),
				isLoading: false,
				error: null,
			});
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load companies' });
			throw e;
		}
	},
	async fetchOne(id: string) {
		set({ isLoading: true, error: null });
		try {
			const item = await companiesService.getCompany(id);
			if (item) {
				set((state) => ({
					itemById: { ...state.itemById, [item.id]: item },
					items: (state.items as Company[]).some((i: Company) => i.id === item.id)
						? (state.items as Company[]).map((i: Company) => (i.id === item.id ? item : i))
						: [item, ...state.items],
					isLoading: false,
				}));
			} else {
				set({ isLoading: false });
			}
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load company' });
			throw e;
		}
	},
	async create(input: CompanyInput) {
		set({ isSaving: true, error: null });
		try {
			const created = await companiesService.createCompany(input);
			set((state) => ({
				items: [created, ...(state.items as Company[])],
				itemById: { ...(state.itemById as Record<string, Company>), [created.id]: created },
				isSaving: false,
			}));
			return created;
		} catch (e) {
			set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to create company' });
			throw e;
		}
	},
	async update(id: string, updates: Partial<Company>) {
		set({ isSaving: true, error: null });
		const previous = get().itemById[id];
		if (previous) {
			const optimistic = { ...previous, ...updates } as Company;
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Company>), [id]: optimistic },
				items: (state.items as Company[]).map((i: Company) => (i.id === id ? optimistic : i)),
			}));
		}
		try {
			const updated = await companiesService.updateCompany(id, updates);
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Company>), [id]: updated },
				items: (state.items as Company[]).map((i: Company) => (i.id === id ? updated : i)),
				isSaving: false,
			}));
			return updated;
		} catch (e) {
			if (previous) {
				set((state) => ({
					itemById: { ...(state.itemById as Record<string, Company>), [id]: previous },
					items: (state.items as Company[]).map((i: Company) => (i.id === id ? previous : i)),
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update company',
				}));
			} else {
				set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to update company' });
			}
			throw e;
		}
	},
	async remove(id: string) {
		const prev = get().itemById[id];
		set((state) => ({
			items: (state.items as Company[]).filter((i: Company) => i.id !== id),
			itemById: Object.fromEntries(
				Object.entries(state.itemById as Record<string, Company>).filter(([k]) => k !== id)
			) as Record<string, Company>,
		}));
		try {
			await companiesService.deleteCompany(id);
		} catch (e) {
			if (prev) {
				set((state) => ({
					items: [prev, ...(state.items as Company[])],
					itemById: { ...(state.itemById as Record<string, Company>), [prev.id]: prev },
					error: e instanceof Error ? e.message : 'Failed to delete company',
				}));
			}
			throw e;
		}
	},
	startRealtime(organisationId: string) {
		const subscription = companiesService.subscribeToCompanies(organisationId, (payload) => {
			if (payload.eventType === 'INSERT') {
				set((state) => ({
					items: [payload.new as Company, ...(state.items as Company[])],
					itemById: {
						...(state.itemById as Record<string, Company>),
						[(payload.new as Company).id]: payload.new as Company,
					},
				}));
			} else if (payload.eventType === 'UPDATE') {
				set((state) => ({
					items: (state.items as Company[]).map((i: Company) =>
						i.id === (payload.new as Company).id ? (payload.new as Company) : i
					),
					itemById: {
						...(state.itemById as Record<string, Company>),
						[(payload.new as Company).id]: payload.new as Company,
					},
				}));
			} else if (payload.eventType === 'DELETE') {
				set((state) => ({
					items: (state.items as Company[]).filter((i: Company) => i.id !== (payload.old as Company).id),
					itemById: Object.fromEntries(
						Object.entries(state.itemById as Record<string, Company>).filter(
							([k]) => k !== (payload.old as Company).id
						)
					) as Record<string, Company>,
				}));
			}
		});
		return () => {
			void subscription.unsubscribe();
		};
	},
}));
