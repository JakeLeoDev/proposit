import { create, type StoreApi } from 'zustand';
import type { EntitySlice } from './store-types';

type IdRecord = { id: string; created_at: string };

export function createEntityStore<T extends IdRecord>(
	impl: (
		set: StoreApi<EntitySlice<T>>['setState'],
		get: StoreApi<EntitySlice<T>>['getState']
	) => Omit<
		EntitySlice<T>,
		keyof Pick<EntitySlice<T>, 'items' | 'itemById' | 'isLoading' | 'isSaving' | 'error' | 'hydrate'>
	> & { _init?: () => void }
) {
	return create<EntitySlice<T>>((set, get) => {
		const initialState = {
			items: [] as T[],
			itemById: {} as Record<string, T>,
			isLoading: false,
			isSaving: false,
			error: null as string | null,
		} satisfies Pick<EntitySlice<T>, 'items' | 'itemById' | 'isLoading' | 'isSaving' | 'error'>;

		const api = impl(set, get);

		return {
			...initialState,
			...api,
			hydrate: (list?: T[], one?: T | null) => {
				if (list && list.length > 0) {
					set({
						items: list,
						itemById: list.reduce(
							(acc, item) => {
								acc[item.id] = item;
								return acc;
							},
							{} as Record<string, T>
						),
						error: null,
						isLoading: false,
					});
				}
				if (one) {
					set((state) => ({
						itemById: { ...state.itemById, [one.id]: one },
						items: (state.items as T[]).some((i: T) => i.id === one.id)
							? (state.items as T[]).map((i: T) => (i.id === one.id ? one : i))
							: [one, ...state.items],
					}));
				}
			},
		} as EntitySlice<T>;
	});
}
