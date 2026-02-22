import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const Breadcrumb = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
	({ className, ...props }, ref) => (
		<nav ref={ref} aria-label="breadcrumb" className={cn('w-full', className)} {...props} />
	)
);
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.HTMLAttributes<HTMLOListElement>>(
	({ className, ...props }, ref) => (
		<ol
			ref={ref}
			className={cn(
				'flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground sm:gap-2.5',
				className
			)}
			{...props}
		/>
	)
);
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
	({ className, ...props }, ref) => (
		<li ref={ref} className={cn('inline-flex items-center gap-1.5', className)} {...props} />
	)
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

interface BreadcrumbLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	asChild?: boolean;
}

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
	({ asChild, className, ...props }, ref) => {
		const Comp = asChild ? Slot : 'a';
		return (
			<Comp
				ref={ref}
				className={cn('transition-colors hover:text-foreground cursor-pointer', className)}
				{...props}
			/>
		);
	}
);
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
	({ className, ...props }, ref) => (
		<span
			ref={ref}
			role="link"
			aria-disabled="true"
			aria-current="page"
			className={cn('font-medium text-foreground', className)}
			{...props}
		/>
	)
);
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
	({ className, children, ...props }, ref) => (
		<li
			ref={ref}
			role="presentation"
			aria-hidden="true"
			className={cn('[&>svg]:h-3.5 [&>svg]:w-3.5', className)}
			{...props}
		>
			{children ?? <div>/</div>}
		</li>
	)
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

const BreadcrumbEllipsis = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
	({ className, ...props }, ref) => (
		<span ref={ref} className={cn('flex h-9 w-9 items-center justify-center', className)} {...props}>
			<MoreHorizontal className="h-4 w-4" />
			<span className="sr-only">More</span>
		</span>
	)
);
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

export {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbPage,
	BreadcrumbSeparator,
	BreadcrumbEllipsis,
};
