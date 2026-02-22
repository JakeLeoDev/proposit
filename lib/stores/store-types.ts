import type { StateCreator } from 'zustand';

export interface EntitySlice<T> {
	items: T[];
	itemById: Record<string, T>;
	isLoading: boolean;
	isSaving: boolean;
	error?: string | null;
	fetchAll: (organisationId: string) => Promise<void>;
	fetchOne: (id: string) => Promise<void>;
	create: (input: Omit<T, 'id' | 'created_at'>) => Promise<T>;
	update: (id: string, updates: Partial<T>) => Promise<T>;
	remove: (id: string) => Promise<void>;
	hydrate: (list?: T[], one?: T | null) => void;
	startRealtime: (organisationId: string) => () => void | Promise<void>;
}

export type SliceCreator<TState> = StateCreator<TState, [], [], TState>;

export function listToById<T extends { id: string }>(list: T[]): Record<string, T> {
	return list.reduce(
		(acc, item) => {
			acc[item.id] = item;
			return acc;
		},
		{} as Record<string, T>
	);
}
