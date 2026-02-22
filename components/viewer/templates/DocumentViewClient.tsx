'use client';

import { useRef, useEffect } from 'react';
import LogoBox from '@/components/viewer/atoms/LogoBox';
import OfferTitle from '@/components/viewer/atoms/OfferTitle';
import OfferMeta from '@/components/viewer/molecules/OfferMeta';
import PDFDownloadButton from '@/components/viewer/atoms/PDFDownloadButton';
import DocumentPages from '@/components/viewer/organisms/DocumentPages';
import { DocumentProvider } from '@/components/viewer/contexts/DocumentContext';
import SectionOverview from '@/components/viewer/molecules/SectionOverview';

interface DocumentViewClientProps {
	canvas?: boolean;
}

function Sidebar({ hideInCanvas }: { hideInCanvas?: boolean }) {
	if (hideInCanvas) {
		return null;
	}

	return (
		<div className="sticky text-black w-[350px] -mr-4 top-0 h-fit flex flex-col mt-4 z-50 bg-[#fff] shadow-2xl/50 print:hidden">
			<LogoBox />
			<OfferTitle />
			<OfferMeta />
			<SectionOverview />
			<PDFDownloadButton />
		</div>
	);
}

export default function DocumentViewClient({ canvas = false }: DocumentViewClientProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Disable dark mode for proposal view - keep it disabled while component is mounted
	useEffect(() => {
		const root = document.documentElement;

		// Remove dark class immediately
		root.classList.remove('dark');

		// Watch for any attempts to add dark class and remove it
		const observer = new MutationObserver(() => {
			if (root.classList.contains('dark')) {
				root.classList.remove('dark');
			}
		});

		observer.observe(root, {
			attributes: true,
			attributeFilter: ['class'],
		});

		// Cleanup
		return () => {
			observer.disconnect();
		};
	}, []);

	return (
		<DocumentProvider>
			<div
				ref={scrollContainerRef}
				data-scroll-container
				className="w-full h-[calc(100svh)] overflow-y-auto bg-[#202629] py-16 flex flex-row justify-center gap-x-0 print:flex-col print:overflow-visible print:h-auto print:bg-white print:py-0"
			>
				<Sidebar hideInCanvas={canvas} />
				<DocumentPages scrollContainer={scrollContainerRef} />
			</div>
		</DocumentProvider>
	);
}
