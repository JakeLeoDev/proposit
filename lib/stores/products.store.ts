import { createEntityStore } from './create-entity-store';
import { productCollectionsService } from '@/lib/product-collections-service';
import type { ProductCollectionTemplate } from '@/lib/types';

type ProductCollectionInput = Omit<ProductCollectionTemplate, 'id' | 'created_at'>;

export const useProductsStore = createEntityStore<ProductCollectionTemplate>((set, get) => ({
	async fetchAll(organisationId: string) {
		set({ isLoading: true, error: null });
		try {
			const list = await productCollectionsService.getCollections(organisationId);
			set({
				items: list,
				itemById: list.reduce(
					(acc, item) => {
						acc[item.id] = item;
						return acc;
					},
					{} as Record<string, ProductCollectionTemplate>
				),
				isLoading: false,
				error: null,
			});
		} catch (e) {
			set({
				isLoading: false,
				error: e instanceof Error ? e.message : 'Failed to load product collections',
			});
			throw e;
		}
	},
	async fetchOne(id: string) {
		set({ isLoading: true, error: null });
		try {
			const item = await productCollectionsService.getCollection(id);
			if (item) {
				set((state) => ({
					itemById: { ...state.itemById, [item.id]: item },
					items: (state.items as ProductCollectionTemplate[]).some(
						(i: ProductCollectionTemplate) => i.id === item.id
					)
						? (state.items as ProductCollectionTemplate[]).map((i: ProductCollectionTemplate) =>
								i.id === item.id ? item : i
							)
						: [item, ...state.items],
					isLoading: false,
				}));
			} else {
				set({ isLoading: false });
			}
		} catch (e) {
			set({
				isLoading: false,
				error: e instanceof Error ? e.message : 'Failed to load product collection',
			});
			throw e;
		}
	},
	async create(input: ProductCollectionInput) {
		set({ isSaving: true, error: null });
		try {
			const created = await productCollectionsService.createCollection(input);
			set((state) => ({
				items: [created, ...(state.items as ProductCollectionTemplate[])],
				itemById: {
					...(state.itemById as Record<string, ProductCollectionTemplate>),
					[created.id]: created,
				},
				isSaving: false,
			}));
			return created;
		} catch (e) {
			set({
				isSaving: false,
				error: e instanceof Error ? e.message : 'Failed to create product collection',
			});
			throw e;
		}
	},
	async update(id: string, updates: Partial<ProductCollectionTemplate>) {
		set({ isSaving: true, error: null });
		const previous = get().itemById[id];
		if (previous) {
			const optimistic = { ...previous, ...updates } as ProductCollectionTemplate;
			set((state) => ({
				itemById: {
					...(state.itemById as Record<string, ProductCollectionTemplate>),
					[id]: optimistic,
				},
				items: (state.items as ProductCollectionTemplate[]).map((i: ProductCollectionTemplate) =>
					i.id === id ? optimistic : i
				),
			}));
		}
		try {
			const updated = await productCollectionsService.updateCollection(id, updates);
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, ProductCollectionTemplate>), [id]: updated },
				items: (state.items as ProductCollectionTemplate[]).map((i: ProductCollectionTemplate) =>
					i.id === id ? updated : i
				),
				isSaving: false,
			}));
			return updated;
		} catch (e) {
			if (previous) {
				set((state) => ({
					itemById: { ...(state.itemById as Record<string, ProductCollectionTemplate>), [id]: previous },
					items: (state.items as ProductCollectionTemplate[]).map((i: ProductCollectionTemplate) =>
						i.id === id ? previous : i
					),
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update product collection',
				}));
			} else {
				set({
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update product collection',
				});
			}
			throw e;
		}
	},
	async remove(id: string) {
		const prev = get().itemById[id];
		set((state) => ({
			items: (state.items as ProductCollectionTemplate[]).filter(
				(i: ProductCollectionTemplate) => i.id !== id
			),
			itemById: Object.fromEntries(
				Object.entries(state.itemById as Record<string, ProductCollectionTemplate>).filter(
					([k]) => k !== id
				)
			) as Record<string, ProductCollectionTemplate>,
		}));
		try {
			await productCollectionsService.deleteCollection(id);
		} catch (e) {
			if (prev) {
				set((state) => ({
					items: [prev, ...(state.items as ProductCollectionTemplate[])],
					itemById: {
						...(state.itemById as Record<string, ProductCollectionTemplate>),
						[prev.id]: prev,
					},
					error: e instanceof Error ? e.message : 'Failed to delete product collection',
				}));
			}
			throw e;
		}
	},
	startRealtime(organisationId: string) {
		const subscription = productCollectionsService.subscribeToCollections(
			organisationId,
			(payload) => {
				if (payload.eventType === 'INSERT') {
					set((state) => ({
						items: [
							payload.new as ProductCollectionTemplate,
							...(state.items as ProductCollectionTemplate[]),
						],
						itemById: {
							...(state.itemById as Record<string, ProductCollectionTemplate>),
							[(payload.new as ProductCollectionTemplate).id]: payload.new as ProductCollectionTemplate,
						},
					}));
				} else if (payload.eventType === 'UPDATE') {
					set((state) => ({
						items: (state.items as ProductCollectionTemplate[]).map((i: ProductCollectionTemplate) =>
							i.id === (payload.new as ProductCollectionTemplate).id
								? (payload.new as ProductCollectionTemplate)
								: i
						),
						itemById: {
							...(state.itemById as Record<string, ProductCollectionTemplate>),
							[(payload.new as ProductCollectionTemplate).id]: payload.new as ProductCollectionTemplate,
						},
					}));
				} else if (payload.eventType === 'DELETE') {
					set((state) => ({
						items: (state.items as ProductCollectionTemplate[]).filter(
							(i: ProductCollectionTemplate) => i.id !== (payload.old as ProductCollectionTemplate).id
						),
						itemById: Object.fromEntries(
							Object.entries(state.itemById as Record<string, ProductCollectionTemplate>).filter(
								([k]) => k !== (payload.old as ProductCollectionTemplate).id
							)
						) as Record<string, ProductCollectionTemplate>,
					}));
				}
			}
		);
		return () => {
			void subscription.unsubscribe();
		};
	},
}));
