import { createEntityStore } from './create-entity-store';
import { attachmentsService } from '@/lib/attachments-service';
import type { Attachment } from '@/lib/types';

type AttachmentInput = Omit<Attachment, 'id' | 'created_at'>;

export const useAttachmentsStore = createEntityStore<Attachment>((set, get) => ({
	async fetchAll(organisationId: string) {
		set({ isLoading: true, error: null });
		try {
			const list = await attachmentsService.getAttachments(organisationId);
			set({
				items: list,
				itemById: list.reduce(
					(acc, item) => {
						acc[item.id] = item;
						return acc;
					},
					{} as Record<string, Attachment>
				),
				isLoading: false,
				error: null,
			});
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load attachments' });
			throw e;
		}
	},
	async fetchOne(id: string) {
		set({ isLoading: true, error: null });
		try {
			const item = await attachmentsService.getAttachment(id);
			if (item) {
				set((state) => ({
					itemById: { ...state.itemById, [item.id]: item },
					items: (state.items as Attachment[]).some((i: Attachment) => i.id === item.id)
						? (state.items as Attachment[]).map((i: Attachment) => (i.id === item.id ? item : i))
						: [item, ...state.items],
					isLoading: false,
				}));
			} else {
				set({ isLoading: false });
			}
		} catch (e) {
			set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load attachment' });
			throw e;
		}
	},
	async create(input: AttachmentInput) {
		set({ isSaving: true, error: null });
		try {
			const created = await attachmentsService.createAttachment(input);
			set((state) => ({
				items: [created, ...state.items],
				itemById: { ...state.itemById, [created.id]: created },
				isSaving: false,
			}));
			return created;
		} catch (e) {
			set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to create attachment' });
			throw e;
		}
	},
	async update(id: string, updates: Partial<Attachment>) {
		set({ isSaving: true, error: null });
		const previous = get().itemById[id];
		// optimistic
		if (previous) {
			const optimistic = { ...previous, ...updates } as Attachment;
			set((state) => ({
				itemById: { ...state.itemById, [id]: optimistic },
				items: (state.items as Attachment[]).map((i: Attachment) => (i.id === id ? optimistic : i)),
			}));
		}
		try {
			const updated = await attachmentsService.updateAttachment(id, updates);
			set((state) => ({
				itemById: { ...state.itemById, [id]: updated },
				items: (state.items as Attachment[]).map((i: Attachment) => (i.id === id ? updated : i)),
				isSaving: false,
			}));
			return updated;
		} catch (e) {
			// rollback
			if (previous) {
				set((state) => ({
					itemById: { ...state.itemById, [id]: previous },
					items: (state.items as Attachment[]).map((i: Attachment) => (i.id === id ? previous : i)),
					isSaving: false,
					error: e instanceof Error ? e.message : 'Failed to update attachment',
				}));
			} else {
				set({ isSaving: false, error: e instanceof Error ? e.message : 'Failed to update attachment' });
			}
			throw e;
		}
	},
	async remove(id: string) {
		const prev = get().itemById[id];
		set((state) => ({
			items: (state.items as Attachment[]).filter((i: Attachment) => i.id !== id),
			itemById: Object.fromEntries(
				Object.entries(state.itemById as Record<string, Attachment>).filter(([k]) => k !== id)
			) as Record<string, Attachment>,
		}));
		try {
			await attachmentsService.deleteAttachment(id);
		} catch (e) {
			// rollback
			if (prev) {
				set((state) => ({
					items: [prev, ...(state.items as Attachment[])],
					itemById: { ...(state.itemById as Record<string, Attachment>), [prev.id]: prev },
					error: e instanceof Error ? e.message : 'Failed to delete attachment',
				}));
			}
			throw e;
		}
	},
	startRealtime(organisationId: string) {
		const subscription = attachmentsService.subscribeToAttachments(organisationId, (payload) => {
			if (payload.eventType === 'INSERT') {
				set((state) => ({
					items: [payload.new as Attachment, ...(state.items as Attachment[])],
					itemById: {
						...(state.itemById as Record<string, Attachment>),
						[(payload.new as Attachment).id]: payload.new as Attachment,
					},
				}));
			} else if (payload.eventType === 'UPDATE') {
				set((state) => ({
					items: (state.items as Attachment[]).map((i: Attachment) =>
						i.id === (payload.new as Attachment).id ? (payload.new as Attachment) : i
					),
					itemById: {
						...(state.itemById as Record<string, Attachment>),
						[(payload.new as Attachment).id]: payload.new as Attachment,
					},
				}));
			} else if (payload.eventType === 'DELETE') {
				set((state) => ({
					items: (state.items as Attachment[]).filter(
						(i: Attachment) => i.id !== (payload.old as Attachment).id
					),
					itemById: Object.fromEntries(
						Object.entries(state.itemById as Record<string, Attachment>).filter(
							([k]) => k !== (payload.old as Attachment).id
						)
					) as Record<string, Attachment>,
				}));
			}
		});
		return () => {
			void subscription.unsubscribe();
		};
	},
}));
