'use client';

import { cn } from '@/lib/utils';

interface A4PageProps {
	children: React.ReactNode;
	pageNumber?: number; // 0 or undefined = no page number
	footer?: string; // Organisation footer text
	showFooter?: boolean; // Whether to show footer at all
	className?: string;
}

/**
 * A4Page component renders a single A4-sized page with optional page number and footer
 *
 * Dimensions: 210mm × 297mm
 * Padding: 15mm top, 12mm sides, 20mm bottom
 *
 * Page number and footer are shown only when specified
 * Title page typically has no page number or footer
 */
export default function A4Page({
	children,
	pageNumber: _pageNumber,
	footer: _footer,
	showFooter: _showFooter = true,
	className,
}: A4PageProps) {
	return (
		<div
			className={cn(
				'a4-page relative bg-white',
				'w-[210mm] h-[297mm]',
				'box-border overflow-hidden',
				className
			)}
			style={{
				padding: '15mm 12mm 20mm 12mm',
				pageBreakAfter: 'auto',
				breakAfter: 'auto',
			}}
		>
			{/* Content area - with overflow handling.
                In print mode, @page margins handle top/bottom so we use full height. */}
			<div className="relative overflow-hidden h-full" style={{ height: 'calc(297mm - 35mm)' }}>
				{children}
			</div>

			{/* Footer removed */}
		</div>
	);
}
