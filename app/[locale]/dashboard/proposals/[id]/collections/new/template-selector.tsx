'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { productCollectionsInstancesService } from '@/lib/product-collections-instances-service';
import type { ProductCollectionTemplate } from '@/lib/types';

interface TemplateSelectorProps {
	organisationId: string;
	proposalId: string;
	templates: ProductCollectionTemplate[];
}

export function TemplateSelector({ organisationId, proposalId, templates }: TemplateSelectorProps) {
	const tProducts = useTranslations('products');
	const tProposals = useTranslations('proposals');
	const router = useRouter();
	const [isCreating, setIsCreating] = useState<string | null>(null);

	const handleCreateFromTemplate = async (template: ProductCollectionTemplate) => {
		setIsCreating(template.id);
		try {
			const created = await productCollectionsInstancesService.createCollection({
				proposal_id: proposalId,
				collection_reference: template.id,
				name: template.name,
				description: template.description || null,
				discount: template.discount || null,
				discount_type: template.discount_type || null,
				organisation_id: organisationId,
				show_prices: template.show_prices !== false,
			});

			// Copy items from template
			await productCollectionsInstancesService.copyItemsFromTemplate(
				created.id,
				template.id,
				organisationId
			);

			toast.success(tProposals('collectionCreatedFromTemplate'), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});

			// Redirect to edit page
			router.push(`/dashboard/proposals/${proposalId}/collections/${created.id}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : tProposals('collectionCreateFailed'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		} finally {
			setIsCreating(null);
		}
	};

	if (templates.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{tProducts('chooseTemplate')}</CardTitle>
					<CardDescription>{tProducts('noTemplatesAvailable')}</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{tProducts('chooseTemplate')}</CardTitle>
				<CardDescription>{tProducts('chooseTemplateDescription')}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{templates.map((template) => (
						<Card key={template.id} className="hover:shadow-md transition-shadow">
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<CardTitle className="text-lg">{template.name}</CardTitle>
										{template.iternal_name && (
											<p className="text-sm text-muted-foreground mt-1">{template.iternal_name}</p>
										)}
									</div>
									{template.discount && template.discount_type && (
										<Badge variant="secondary" className="ml-2">
											{template.discount_type === 'percent'
												? `${template.discount}%`
												: `€${template.discount}`}
										</Badge>
									)}
								</div>
							</CardHeader>
							<CardContent className="pt-0">
								{template.description && (
									<p className="text-sm text-muted-foreground mb-4 line-clamp-2">{template.description}</p>
								)}

								{template.internal_notes && (
									<div className="mb-4">
										<Separator className="my-2" />
										<p className="text-xs text-muted-foreground">{template.internal_notes}</p>
									</div>
								)}

								<Button
									onClick={() => handleCreateFromTemplate(template)}
									disabled={isCreating === template.id}
									className="w-full"
									size="sm"
								>
									{isCreating === template.id ? 'Creating...' : tProducts('createFromTemplate')}
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
