'use client';

import Image from 'next/image';

interface LogoProps {
	width?: number;
	height?: number;
	className?: string;
	alt?: string;
}

export function Logo({
	width = 32,
	height,
	className = 'h-8 w-auto object-contain',
	alt = 'Proposit',
}: LogoProps) {
	// Aspect ratio from logo design (430x521)
	const aspectRatio = 430 / 521;
	const imgHeight = height ?? width / aspectRatio;

	return (
		<Image
			src="/Logo.png"
			alt={alt}
			width={width}
			height={imgHeight}
			className={className}
			aria-label={alt}
			priority
		/>
	);
}
