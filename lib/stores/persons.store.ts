import { createEntityStore } from './create-entity-store';
import { personsService } from '@/lib/persons-service';
import type { Person } from '@/lib/types';

type PersonInput = Omit<Person, 'id' | 'created_at'>;

export const usePersonsStore = createEntityStore<Person>((set, get) => ({
	async fetchAll(organisationId: string) {
		set({ isLoading: true, error: null });
		try {
			const list = await personsService.getPersons(organisationId);
			set({
				items: list,
				itemById: list.reduce(
					(acc, item) => {
						acc[item.id] = item;
						return acc;
					},
					{} as Record<string, Person>
				),
				isLoading: false,
				error: null,
			});
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load persons' });
			throw e;
		}
	},
	async fetchOne(id: string) {
		set({ isLoading: true, error: null });
		try {
			const item = await personsService.getPerson(id);
			if (item) {
				set((state) => ({
					itemById: { ...state.itemById, [item.id]: item },
					items: (state.items as Person[]).some((i: Person) => i.id === item.id)
						? (state.items as Person[]).map((i: Person) => (i.id === item.id ? item : i))
						: [item, ...state.items],
					isLoading: false,
				}));
			} else {
				set({ isLoading: false });
			}
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load person' });
			throw e;
		}
	},
	async create(input: PersonInput) {
		set({ isSaving: true, error: null });
		try {
			const created = await personsService.createPerson(input);
			set((state) => ({
				items: [created, ...(state.items as Person[])],
				itemById: { ...(state.itemById as Record<string, Person>), [created.id]: created },
				isSaving: false,
			}));
			return created;
		} catch (e) {
			set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to create person' });
			throw e;
		}
	},
	async update(id: string, updates: Partial<Person>) {
		set({ isSaving: true, error: null });
		const previous = get().itemById[id];
		if (previous) {
			const optimistic = { ...previous, ...updates } as Person;
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Person>), [id]: optimistic },
				items: (state.items as Person[]).map((i: Person) => (i.id === id ? optimistic : i)),
			}));
		}
		try {
			const updated = await personsService.updatePerson(id, updates);
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Person>), [id]: updated },
				items: (state.items as Person[]).map((i: Person) => (i.id === id ? updated : i)),
				isSaving: false,
			}));
			return updated;
		} catch (e) {
			if (previous) {
				set((state) => ({
					itemById: { ...(state.itemById as Record<string, Person>), [id]: previous },
					items: (state.items as Person[]).map((i: Person) => (i.id === id ? previous : i)),
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update person',
				}));
			} else {
				set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to update person' });
			}
			throw e;
		}
	},
	async remove(id: string) {
		const prev = get().itemById[id];
		set((state) => ({
			items: (state.items as Person[]).filter((i: Person) => i.id !== id),
			itemById: Object.fromEntries(
				Object.entries(state.itemById as Record<string, Person>).filter(([k]) => k !== id)
			) as Record<string, Person>,
		}));
		try {
			await personsService.deletePerson(id);
		} catch (e) {
			if (prev) {
				set((state) => ({
					items: [prev, ...(state.items as Person[])],
					itemById: { ...(state.itemById as Record<string, Person>), [prev.id]: prev },
					error: e instanceof Error ? e.message : 'Failed to delete person',
				}));
			}
			throw e;
		}
	},
	startRealtime(organisationId: string) {
		const subscription = personsService.subscribeToPersons(organisationId, (payload) => {
			if (payload.eventType === 'INSERT') {
				set((state) => ({
					items: [payload.new as Person, ...(state.items as Person[])],
					itemById: {
						...(state.itemById as Record<string, Person>),
						[(payload.new as Person).id]: payload.new as Person,
					},
				}));
			} else if (payload.eventType === 'UPDATE') {
				set((state) => ({
					items: (state.items as Person[]).map((i: Person) =>
						i.id === (payload.new as Person).id ? (payload.new as Person) : i
					),
					itemById: {
						...(state.itemById as Record<string, Person>),
						[(payload.new as Person).id]: payload.new as Person,
					},
				}));
			} else if (payload.eventType === 'DELETE') {
				set((state) => ({
					items: (state.items as Person[]).filter((i: Person) => i.id !== (payload.old as Person).id),
					itemById: Object.fromEntries(
						Object.entries(state.itemById as Record<string, Person>).filter(
							([k]) => k !== (payload.old as Person).id
						)
					) as Record<string, Person>,
				}));
			}
		});
		return () => {
			void subscription.unsubscribe();
		};
	},
}));
