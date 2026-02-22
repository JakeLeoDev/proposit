'use client';

import { createContext, useContext } from 'react';

interface EditorProposalContextValue {
	proposalId?: string;
}

const EditorProposalContext = createContext<EditorProposalContextValue>({});

export function EditorProposalProvider({
	proposalId,
	children,
}: {
	proposalId?: string;
	children: React.ReactNode;
}) {
	return (
		<EditorProposalContext.Provider value={{ proposalId }}>{children}</EditorProposalContext.Provider>
	);
}

export function useEditorProposalContext(): EditorProposalContextValue {
	return useContext(EditorProposalContext);
}
