'use client';

import { useRef } from 'react';
import DocumentPages from '@/components/viewer/organisms/DocumentPages';
import { DocumentProvider } from '@/components/viewer/contexts/DocumentContext';
export default function DocumentPdfViewClient() {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	return (
		<DocumentProvider>
			<div
				ref={scrollContainerRef}
				data-scroll-container
				className="min-h-[200px] w-full text-sm text-foreground bg-[#202629] flex flex-col items-center print:bg-white print:text-black print:p-0 print:m-0"
			>
				<DocumentPages scrollContainer={scrollContainerRef} singlePage />
			</div>
		</DocumentProvider>
	);
}
