'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { attachmentsService } from '@/lib/attachments-service';
import { categoriesService } from '@/lib/categories-service';
import { certificatesService } from '@/lib/certificates-service';
import { companiesService } from '@/lib/companies-service';
import { productCollectionsService } from '@/lib/product-collections-service';
import { productCollectionsInstancesService } from '@/lib/product-collections-instances-service';
import { productItemsService } from '@/lib/product-items-service';
import { proposalsService } from '@/lib/proposals-service';
import { qualificationsService } from '@/lib/qualifications-service';

export function DashboardBreadcrumbs() {
	const pathname = usePathname();
	const t = useTranslations('navigation');
	const segments = pathname.split('/').filter(Boolean);
	const [locale, ...rest] = segments;

	const [dynamicLabels, setDynamicLabels] = React.useState<Record<string, string>>({});

	React.useEffect(() => {
		let cancelled = false;
		async function loadLabels() {
			const labels: Record<string, string> = {};
			for (let i = 0; i < rest.length; i++) {
				const segment = rest[i];
				const parent = rest[i - 1];
				const grandparent = rest[i - 2];

				// Determine the correct fetcher based on context
				let fetcher: ((id: string) => Promise<string | undefined>) | undefined;

				if (parent === 'collections' && grandparent && !isNaN(parseInt(grandparent))) {
					// This is a proposal collection instance (e.g., /proposals/123/collections/456)
					fetcher = nameFetchers['collections'];
				} else if (parent && nameFetchers[parent]) {
					// Use the standard fetcher for this parent
					fetcher = nameFetchers[parent];
				}

				// Skip fetching for special segments that are not entity IDs
				const specialSegments = ['new', 'edit', 'create'];
				if (fetcher && !specialSegments.includes(segment)) {
					try {
						const name = await fetcher(segment);
						if (name) labels[segment] = name;
					} catch (err) {
						// eslint-disable-next-line no-console
						console.error('Failed to load breadcrumb label', err);
					}
				}
			}
			if (!cancelled) setDynamicLabels(labels);
		}
		loadLabels();
		return () => {
			cancelled = true;
		};
	}, [pathname]);

	if (segments.length === 0) return null;

	const breadcrumbs = rest.map((segment, index) => {
		const href = '/' + [locale, ...rest.slice(0, index + 1)].join('/');
		const label = dynamicLabels[segment] || labelForSegment(segment, t);
		const isLast = index === rest.length - 1;
		return { href: isLast ? undefined : href, label };
	});

	if (breadcrumbs.length <= 1) return null;

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{breadcrumbs.map((crumb, index) => (
					<React.Fragment key={index}>
						<BreadcrumbItem>
							{crumb.href ? (
								<BreadcrumbLink asChild>
									<Link href={crumb.href}>{crumb.label}</Link>
								</BreadcrumbLink>
							) : (
								<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
							)}
						</BreadcrumbItem>
						{index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
					</React.Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

function labelForSegment(segment: string, t: ReturnType<typeof useTranslations>) {
	const map: Record<string, string> = {
		dashboard: t('dashboard'),
		proposals: t('proposals'),
		qualifications: t('qualifications'),
		certificates: t('certificates'),
		products: t('products'),
		categories: t('categories'),
		companies: t('companies'),
		attachments: t('attachments'),
		'ai-assistant': t('aiAssistant'),
		prompts: t('promptTemplates'),
		settings: t('settings'),
		organisation: t('organisation'),
		new: t('new'),
	};
	return map[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

const nameFetchers: Record<string, (id: string) => Promise<string | undefined>> = {
	proposals: async (id) => (await proposalsService.getProposal(id))?.name,
	categories: async (id) => (await categoriesService.getCategory(id))?.name,
	companies: async (id) => (await companiesService.getCompany(id))?.name,
	attachments: async (id) => (await attachmentsService.getAttachment(id))?.name,
	products: async (id) => (await productCollectionsService.getCollection(id))?.name,
	certificates: async (id) => (await certificatesService.getCertificate(id))?.name,
	qualifications: async (id) => (await qualificationsService.getQualification(id))?.name,
	collections: async (id) => (await productCollectionsInstancesService.getCollection(id))?.name,
	items: async (id) => (await productItemsService.getItem(id))?.name,
};
