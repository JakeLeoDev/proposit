import { createEntityStore } from './create-entity-store';
import { qualificationsService } from '@/lib/qualifications-service';
import type { Qualification } from '@/lib/types';

type QualificationInput = Omit<Qualification, 'id' | 'created_at'>;

export const useQualificationsStore = createEntityStore<Qualification>((set, get) => ({
	async fetchAll(organisationId: string) {
		set({ isLoading: true, error: null });
		try {
			const list = await qualificationsService.getQualifications(organisationId);
			set({
				items: list,
				itemById: list.reduce(
					(acc, item) => {
						acc[item.id] = item;
						return acc;
					},
					{} as Record<string, Qualification>
				),
				isLoading: false,
				error: null,
			});
		} catch (e) {
			set({
				isLoading: false,
				error: e instanceof Error ? e.message : 'Failed to load qualifications',
			});
			throw e;
		}
	},
	async fetchOne(id: string) {
		set({ isLoading: true, error: null });
		try {
			const item = await qualificationsService.getQualification(id);
			if (item) {
				set((state) => ({
					itemById: { ...state.itemById, [item.id]: item },
					items: (state.items as Qualification[]).some((i: Qualification) => i.id === item.id)
						? (state.items as Qualification[]).map((i: Qualification) => (i.id === item.id ? item : i))
						: [item, ...state.items],
					isLoading: false,
				}));
			} else {
				set({ isLoading: false });
			}
		} catch (e) {
			set({
				isLoading: false,
				error: e instanceof Error ? e.message : 'Failed to load qualification',
			});
			throw e;
		}
	},
	async create(input: QualificationInput) {
		set({ isSaving: true, error: null });
		try {
			const created = await qualificationsService.createQualification(input);
			set((state) => ({
				items: [created, ...(state.items as Qualification[])],
				itemById: { ...(state.itemById as Record<string, Qualification>), [created.id]: created },
				isSaving: false,
			}));
			return created;
		} catch (e) {
			set({
				isSaving: false,
				error: e instanceof Error ? e.message : 'Failed to create qualification',
			});
			throw e;
		}
	},
	async update(id: string, updates: Partial<Qualification>) {
		set({ isSaving: true, error: null });
		const previous = get().itemById[id];
		if (previous) {
			const optimistic = { ...previous, ...updates } as Qualification;
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Qualification>), [id]: optimistic },
				items: (state.items as Qualification[]).map((i: Qualification) =>
					i.id === id ? optimistic : i
				),
			}));
		}
		try {
			const updated = await qualificationsService.updateQualification(id, updates);
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Qualification>), [id]: updated },
				items: (state.items as Qualification[]).map((i: Qualification) => (i.id === id ? updated : i)),
				isSaving: false,
			}));
			return updated;
		} catch (e) {
			if (previous) {
				set((state) => ({
					itemById: { ...(state.itemById as Record<string, Qualification>), [id]: previous },
					items: (state.items as Qualification[]).map((i: Qualification) =>
						i.id === id ? previous : i
					),
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update qualification',
				}));
			} else {
				set({
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update qualification',
				});
			}
			throw e;
		}
	},
	async remove(id: string) {
		const prev = get().itemById[id];
		set((state) => ({
			items: (state.items as Qualification[]).filter((i: Qualification) => i.id !== id),
			itemById: Object.fromEntries(
				Object.entries(state.itemById as Record<string, Qualification>).filter(([k]) => k !== id)
			) as Record<string, Qualification>,
		}));
		try {
			await qualificationsService.deleteQualification(id);
		} catch (e) {
			if (prev) {
				set((state) => ({
					items: [prev, ...(state.items as Qualification[])],
					itemById: { ...(state.itemById as Record<string, Qualification>), [prev.id]: prev },
					error: e instanceof Error ? e.message : 'Failed to delete qualification',
				}));
			}
			throw e;
		}
	},
	startRealtime(organisationId: string) {
		const subscription = qualificationsService.subscribeToQualifications(
			organisationId,
			(payload) => {
				if (payload.eventType === 'INSERT') {
					set((state) => ({
						items: [payload.new as Qualification, ...(state.items as Qualification[])],
						itemById: {
							...(state.itemById as Record<string, Qualification>),
							[(payload.new as Qualification).id]: payload.new as Qualification,
						},
					}));
				} else if (payload.eventType === 'UPDATE') {
					set((state) => ({
						items: (state.items as Qualification[]).map((i: Qualification) =>
							i.id === (payload.new as Qualification).id ? (payload.new as Qualification) : i
						),
						itemById: {
							...(state.itemById as Record<string, Qualification>),
							[(payload.new as Qualification).id]: payload.new as Qualification,
						},
					}));
				} else if (payload.eventType === 'DELETE') {
					set((state) => ({
						items: (state.items as Qualification[]).filter(
							(i: Qualification) => i.id !== (payload.old as Qualification).id
						),
						itemById: Object.fromEntries(
							Object.entries(state.itemById as Record<string, Qualification>).filter(
								([k]) => k !== (payload.old as Qualification).id
							)
						) as Record<string, Qualification>,
					}));
				}
			}
		);
		return () => {
			void subscription.unsubscribe();
		};
	},
}));
