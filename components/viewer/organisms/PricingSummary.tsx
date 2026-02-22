'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useProposalContext } from '@/components/viewer/contexts/ProposalContext';
import { productCollectionsInstancesService } from '@/lib/product-collections-instances-service';
import { productItemsInstancesService } from '@/lib/product-items-instances-service';
import type { ProductCollection, ProductItem } from '@/lib/types';

export default function PricingSummary() {
	const t = useTranslations('viewer');
	const { data } = useProposalContext();
	const proposalId = data?.proposal.id;
	const [collections, setCollections] = useState<ProductCollection[]>([]);
	const [itemsByCollection, setItemsByCollection] = useState<Record<string, ProductItem[]>>({});

	useEffect(() => {
		const unsubs: { unsubscribe: () => void }[] = [];
		(async () => {
			if (!proposalId) return;
			const cols = await productCollectionsInstancesService.getCollectionsByProposal(proposalId);
			setCollections(cols);
			// Load items per collection
			const entries = await Promise.all(
				cols.map(async (c) => {
					const its = await productItemsInstancesService.getItemsByCollection(c.id);
					return [c.id, its] as const;
				})
			);
			setItemsByCollection(Object.fromEntries(entries));
			// Subscribe to changes
			unsubs.push(
				productCollectionsInstancesService.subscribeToCollectionsByProposal(proposalId, () => {})
			);
			for (const c of cols) {
				unsubs.push(productItemsInstancesService.subscribeToItemsByCollection(c.id, () => {}));
			}
		})();
		return () => {
			unsubs.forEach((u) => u.unsubscribe());
		};
	}, [proposalId]);

	const totalsByCollection = useMemo(() => {
		const map: Record<string, { subtotal: number; name: string; discount: number; total: number }> =
			{};
		for (const c of collections) {
			const items = itemsByCollection[c.id] || [];
			const subtotal = items.reduce((acc, it) => {
				const qty = Number(it.unit_amount || 0);
				const price = Number(it.unit_price || 0);
				return acc + qty * price;
			}, 0);

			// Calculate collection-level discount
			let discount = 0;
			if (c.discount && c.discount_type) {
				const discountValue = parseFloat(c.discount);
				if (c.discount_type === 'percent') {
					discount = subtotal * (discountValue / 100);
				} else if (c.discount_type === 'fixed') {
					discount = discountValue;
				}
			}

			const total = subtotal - discount;
			map[c.id] = { subtotal, name: c.name, discount, total };
		}
		return map;
	}, [collections, itemsByCollection]);

	const collectionsWithPrices = useMemo(
		() => collections.filter((c) => c.show_prices !== false),
		[collections]
	);
	const grandTotal = useMemo(
		() => collectionsWithPrices.reduce((sum, c) => sum + (totalsByCollection[c.id]?.total ?? 0), 0),
		[totalsByCollection, collectionsWithPrices]
	);

	return (
		<div className="p-4 border-t space-y-2">
			<h3 className="text-lg font-semibold">{t('pricingSummary')}</h3>
			<div className="space-y-1">
				{collectionsWithPrices.map((c) => {
					const totals = totalsByCollection[c.id];
					if (!totals) return null;

					return (
						<div key={c.id} className="space-y-1">
							<div className="flex items-center justify-between text-sm">
								<span>{c.name}</span>
								<span>{totals.subtotal.toFixed(2)} €</span>
							</div>
							{totals.discount > 0 && (
								<div className="flex items-center justify-between text-sm text-muted-foreground ml-4">
									<span>{t('discount')}</span>
									<span>-{totals.discount.toFixed(2)} €</span>
								</div>
							)}
							<div className="flex items-center justify-between text-sm font-medium border-t pt-1">
								<span>{t('total')}</span>
								<span>{totals.total.toFixed(2)} €</span>
							</div>
						</div>
					);
				})}
			</div>
			<div className="flex items-center justify-between border-t pt-2 font-medium">
				<span>{t('total')}</span>
				<span>{grandTotal.toFixed(2)} €</span>
			</div>
			{/* here comes the VAT/discount summary if needed */}
			{data?.organisation?.footer && (
				<div className="pt-4 border-t">
					<div className="text-xs text-muted-foreground text-center">{data.organisation.footer}</div>
				</div>
			)}
		</div>
	);
}
