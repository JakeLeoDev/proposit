'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';

export interface DocumentHeading {
	id: string;
	text: string;
	level: number;
}

interface DocumentContextValue {
	activeModuleIndex: number;
	setActiveModuleIndex: (i: number) => void;
	registerScrollToModule: (fn: (i: number) => void) => void;
	scrollToModule: (i: number) => void;
	headings: DocumentHeading[];
	setHeadings: (h: DocumentHeading[]) => void;
	registerScrollToSection: (fn: (id: string) => void) => void;
	scrollToSection: (id: string) => void;
}

const DocumentContext = createContext<DocumentContextValue | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
	const [activeModuleIndex, setActiveModuleIndex] = useState(-1);
	const [headings, setHeadings] = useState<DocumentHeading[]>([]);
	const scrollToRef = useRef<(i: number) => void>(() => {});
	const scrollToSectionRef = useRef<(id: string) => void>(() => {});

	const registerScrollToModule = (fn: (i: number) => void) => {
		scrollToRef.current = fn;
	};
	const scrollToModule = (i: number) => scrollToRef.current?.(i);

	const registerScrollToSection = (fn: (id: string) => void) => {
		scrollToSectionRef.current = fn;
	};
	const scrollToSection = (id: string) => scrollToSectionRef.current?.(id);

	return (
		<DocumentContext.Provider
			value={{
				activeModuleIndex,
				setActiveModuleIndex,
				registerScrollToModule,
				scrollToModule,
				headings,
				setHeadings,
				registerScrollToSection,
				scrollToSection,
			}}
		>
			{children}
		</DocumentContext.Provider>
	);
}

export function useDocument() {
	const ctx = useContext(DocumentContext);
	if (!ctx) throw new Error('useDocument must be used within DocumentProvider');
	return ctx;
}
