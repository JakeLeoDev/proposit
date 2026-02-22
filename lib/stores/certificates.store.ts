import { createEntityStore } from './create-entity-store';
import { certificatesService } from '@/lib/certificates-service';
import type { Certificate } from '@/lib/types';

type CertificateInput = Omit<Certificate, 'id' | 'created_at'>;

export const useCertificatesStore = createEntityStore<Certificate>((set, get) => ({
	async fetchAll(organisationId: string) {
		set({ isLoading: true, error: null });
		try {
			const list = await certificatesService.getCertificates(organisationId);
			set({
				items: list,
				itemById: list.reduce(
					(acc, item) => {
						acc[item.id] = item;
						return acc;
					},
					{} as Record<string, Certificate>
				),
				isLoading: false,
				error: null,
			});
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load certificates' });
			throw e;
		}
	},
	async fetchOne(id: string) {
		set({ isLoading: true, error: null });
		try {
			const item = await certificatesService.getCertificate(id);
			if (item) {
				set((state) => ({
					itemById: { ...state.itemById, [item.id]: item },
					items: (state.items as Certificate[]).some((i: Certificate) => i.id === item.id)
						? (state.items as Certificate[]).map((i: Certificate) => (i.id === item.id ? item : i))
						: [item, ...state.items],
					isLoading: false,
				}));
			} else {
				set({ isLoading: false });
			}
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load certificate' });
			throw e;
		}
	},
	async create(input: CertificateInput) {
		set({ isSaving: true, error: null });
		try {
			const created = await certificatesService.createCertificate(input);
			set((state) => ({
				items: [created, ...(state.items as Certificate[])],
				itemById: { ...(state.itemById as Record<string, Certificate>), [created.id]: created },
				isSaving: false,
			}));
			return created;
		} catch (e) {
			set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to create certificate' });
			throw e;
		}
	},
	async update(id: string, updates: Partial<Certificate>) {
		set({ isSaving: true, error: null });
		const previous = get().itemById[id];
		if (previous) {
			const optimistic = { ...previous, ...updates } as Certificate;
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Certificate>), [id]: optimistic },
				items: (state.items as Certificate[]).map((i: Certificate) => (i.id === id ? optimistic : i)),
			}));
		}
		try {
			const updated = await certificatesService.updateCertificate(id, updates);
			set((state) => ({
				itemById: { ...(state.itemById as Record<string, Certificate>), [id]: updated },
				items: (state.items as Certificate[]).map((i: Certificate) => (i.id === id ? updated : i)),
				isSaving: false,
			}));
			return updated;
		} catch (e) {
			if (previous) {
				set((state) => ({
					itemById: { ...(state.itemById as Record<string, Certificate>), [id]: previous },
					items: (state.items as Certificate[]).map((i: Certificate) => (i.id === id ? previous : i)),
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update certificate',
				}));
			} else {
				set({
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update certificate',
				});
			}
			throw e;
		}
	},
	async remove(id: string) {
		const prev = get().itemById[id];
		set((state) => ({
			items: (state.items as Certificate[]).filter((i: Certificate) => i.id !== id),
			itemById: Object.fromEntries(
				Object.entries(state.itemById as Record<string, Certificate>).filter(([k]) => k !== id)
			) as Record<string, Certificate>,
		}));
		try {
			await certificatesService.deleteCertificate(id);
		} catch (e) {
			if (prev) {
				set((state) => ({
					items: [prev, ...(state.items as Certificate[])],
					itemById: { ...(state.itemById as Record<string, Certificate>), [prev.id]: prev },
					error: e instanceof Error ? e.message : 'Failed to delete certificate',
				}));
			}
			throw e;
		}
	},
	startRealtime(organisationId: string) {
		const subscription = certificatesService.subscribeToCertificates(organisationId, (payload) => {
			if (payload.eventType === 'INSERT') {
				set((state) => ({
					items: [payload.new as Certificate, ...(state.items as Certificate[])],
					itemById: {
						...(state.itemById as Record<string, Certificate>),
						[(payload.new as Certificate).id]: payload.new as Certificate,
					},
				}));
			} else if (payload.eventType === 'UPDATE') {
				set((state) => ({
					items: (state.items as Certificate[]).map((i: Certificate) =>
						i.id === (payload.new as Certificate).id ? (payload.new as Certificate) : i
					),
					itemById: {
						...(state.itemById as Record<string, Certificate>),
						[(payload.new as Certificate).id]: payload.new as Certificate,
					},
				}));
			} else if (payload.eventType === 'DELETE') {
				set((state) => ({
					items: (state.items as Certificate[]).filter(
						(i: Certificate) => i.id !== (payload.old as Certificate).id
					),
					itemById: Object.fromEntries(
						Object.entries(state.itemById as Record<string, Certificate>).filter(
							([k]) => k !== (payload.old as Certificate).id
						)
					) as Record<string, Certificate>,
				}));
			}
		});
		return () => {
			void subscription.unsubscribe();
		};
	},
}));
