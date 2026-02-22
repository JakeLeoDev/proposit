import { createEntityStore } from './create-entity-store';
import { categoriesService } from '@/lib/categories-service';
import type { Category } from '@/lib/types';

type CategoryInput = Omit<Category, 'id' | 'created_at'>;

export const useCategoriesStore = createEntityStore<Category>((set, get) => ({
	async fetchAll(organisationId: string) {
		set({ isLoading: true, error: null });
		try {
			const list = await categoriesService.getCategories(organisationId);
			set({
				items: list,
				itemById: list.reduce(
					(acc, item) => {
						acc[item.id] = item;
						return acc;
					},
					{} as Record<string, Category>
				),
				isLoading: false,
				error: null,
			});
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load categories' });
			throw e;
		}
	},
	async fetchOne(id: string) {
		set({ isLoading: true, error: null });
		try {
			const item = await categoriesService.getCategory(id);
			if (item) {
				set((state) => ({
					itemById: { ...state.itemById, [item.id]: item },
					items: (state.items as Category[]).some((i: Category) => i.id === item.id)
						? (state.items as Category[]).map((i: Category) => (i.id === item.id ? item : i))
						: [item, ...state.items],
					isLoading: false,
				}));
			} else {
				set({ isLoading: false });
			}
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load category' });
			throw e;
		}
	},
	async create(input: CategoryInput) {
		set({ isSaving: true, error: null });
		try {
			const created = await categoriesService.createCategory(input);
			set((state) => ({
				items: [created, ...(state.items as Category[])],
				itemById: { ...(state.itemById as Record<string, Category>), [created.id]: created },
				isSaving: false,
			}));
			return created;
		} catch (e) {
			set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to create category' });
			throw e;
		}
	},
	async update(id: string, updates: Partial<Category>) {
		set({ isSaving: true, error: null });
		const previous = get().itemById[id];
		if (previous) {
			const optimistic = { ...previous, ...updates } as Category;
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Category>), [id]: optimistic },
				items: (state.items as Category[]).map((i: Category) => (i.id === id ? optimistic : i)),
			}));
		}
		try {
			const updated = await categoriesService.updateCategory(id, updates);
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Category>), [id]: updated },
				items: (state.items as Category[]).map((i: Category) => (i.id === id ? updated : i)),
				isSaving: false,
			}));
			return updated;
		} catch (e) {
			if (previous) {
				set((state) => ({
					itemById: { ...(state.itemById as Record<string, Category>), [id]: previous },
					items: (state.items as Category[]).map((i: Category) => (i.id === id ? previous : i)),
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update category',
				}));
			} else {
				set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to update category' });
			}
			throw e;
		}
	},
	async remove(id: string) {
		const prev = get().itemById[id];
		set((state) => ({
			items: (state.items as Category[]).filter((i: Category) => i.id !== id),
			itemById: Object.fromEntries(
				Object.entries(state.itemById as Record<string, Category>).filter(([k]) => k !== id)
			) as Record<string, Category>,
		}));
		try {
			await categoriesService.deleteCategory(id);
		} catch (e) {
			if (prev) {
				set((state) => ({
					items: [prev, ...(state.items as Category[])],
					itemById: { ...(state.itemById as Record<string, Category>), [prev.id]: prev },
					error: e instanceof Error ? e.message : 'Failed to delete category',
				}));
			}
			throw e;
		}
	},
	startRealtime(organisationId: string) {
		const subscription = categoriesService.subscribeToCategories(organisationId, (payload) => {
			if (payload.eventType === 'INSERT') {
				set((state) => ({
					items: [payload.new as Category, ...(state.items as Category[])],
					itemById: {
						...(state.itemById as Record<string, Category>),
						[(payload.new as Category).id]: payload.new as Category,
					},
				}));
			} else if (payload.eventType === 'UPDATE') {
				set((state) => ({
					items: (state.items as Category[]).map((i: Category) =>
						i.id === (payload.new as Category).id ? (payload.new as Category) : i
					),
					itemById: {
						...(state.itemById as Record<string, Category>),
						[(payload.new as Category).id]: payload.new as Category,
					},
				}));
			} else if (payload.eventType === 'DELETE') {
				set((state) => ({
					items: (state.items as Category[]).filter(
						(i: Category) => i.id !== (payload.old as Category).id
					),
					itemById: Object.fromEntries(
						Object.entries(state.itemById as Record<string, Category>).filter(
							([k]) => k !== (payload.old as Category).id
						)
					) as Record<string, Category>,
				}));
			}
		});
		return () => {
			void subscription.unsubscribe();
		};
	},
}));
