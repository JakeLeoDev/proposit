import React, { useEffect, useState } from 'react';
import {
	DecoratorNode,
	type NodeKey,
	type SerializedLexicalNode,
	type Spread,
	$getNodeByKey,
	type LexicalNode,
} from 'lexical';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { productCollectionsInstancesService } from '@/lib/product-collections-instances-service';
import { productItemsInstancesService } from '@/lib/product-items-instances-service';
import { organisationsService } from '@/lib/organisations-service';
import type { ProductCollection, ProductItem, Organisation } from '@/lib/types';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useEditorProposalContext } from '../editor-context';
import { Badge } from '@/components/ui/badge';
import {
	useProposalContext,
	getProductCollectionById,
} from '@/components/viewer/contexts/ProposalContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export type SerializedProductCollectionBlockNode = Spread<
	{
		type: 'product-collection-block';
		version: 1;
		collection_id: string | null;
		template_id?: string | null;
	},
	SerializedLexicalNode
>;

function ProductCollectionEmptyState({ proposalId }: { proposalId?: string }) {
	const t = useTranslations('products');
	const params = useParams<{ locale?: string }>();
	const locale = params?.locale ?? 'de';
	const newCollectionHref = proposalId
		? `/${locale}/dashboard/proposals/${proposalId}/collections/new`
		: null;

	return (
		<Card className="border-dashed bg-muted/30">
			<CardContent className="pt-6 pb-6">
				<div className="flex flex-col items-center justify-center gap-3 text-center">
					<p className="text-sm text-muted-foreground">{t('editorNoCollectionYet')}</p>
					{newCollectionHref && (
						<Button variant="default" size="sm" asChild>
							<Link href={newCollectionHref}>
								<Plus className="h-4 w-4 mr-2" />
								{t('createCollection')}
							</Link>
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// Single unified component that can work in both modes
function ProductCollectionBlock({
	nodeKey,
	collectionId,
}: {
	nodeKey?: NodeKey;
	collectionId: string | null;
}) {
	const [editor] = useLexicalComposerContext();
	const tv = useTranslations('viewer');
	const { proposalId } = useEditorProposalContext();
	const [collection, setCollection] = useState<ProductCollection | null>(null);
	const [items, setItems] = useState<ProductItem[]>([]);
	const [collections, setCollections] = useState<ProductCollection[]>([]);
	const [organisation, setOrganisation] = useState<Organisation | null>(null);
	const [isPrintMode, setIsPrintMode] = useState(false);

	// Sync with print media so we render the table when printing from edit mode
	useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return;
		const mq = window.matchMedia('print');
		const handler = () => setIsPrintMode(mq.matches);
		handler(); // initial
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	}, []);

	// Try to detect if we're in view mode by checking for ProposalContext
	let isViewMode = false;
	let viewCollection: (ProductCollection & { items: ProductItem[] }) | null = null;
	let viewOrganisation: Organisation | null = null;

	// Check if ProposalContext is available (view mode)
	try {
		const proposalContext = useProposalContext();
		isViewMode = true;
		if (collectionId) {
			viewCollection = getProductCollectionById(proposalContext.data, collectionId);
		}
		viewOrganisation = proposalContext.data?.organisation || null;
	} catch {
		// ProposalContext not available, we're in edit mode
		isViewMode = false;
	}

	// Use provided data in view mode, otherwise load from API
	useEffect(() => {
		if (isViewMode) {
			if (viewCollection) {
				setCollection(viewCollection);
				setItems(viewCollection.items || []);
			}
		} else {
			// Edit mode: load collections list if no collection chosen yet
			if (!collectionId && proposalId) {
				productCollectionsInstancesService
					.getCollectionsByProposal(proposalId)
					.then(setCollections)
					.catch(() => setCollections([]));
			}

			// Load selected collection + items with realtime when collectionId present
			if (collectionId) {
				let unsubCol: { unsubscribe: () => void } | null = null;
				let unsubItems: { unsubscribe: () => void } | null = null;
				(async () => {
					try {
						const c = await productCollectionsInstancesService.getCollection(collectionId);
						if (c) {
							setCollection(c);
							// Load organisation for color
							if (c.organisation_id) {
								const org = await organisationsService.getOrganisation(c.organisation_id);
								setOrganisation(org);
							}
						}
						const its = await productItemsInstancesService.getItemsByCollection(collectionId);
						setItems(its);
						unsubCol = productCollectionsInstancesService.subscribeToCollection(
							collectionId,
							(payload) => {
								if (payload.eventType === 'UPDATE') setCollection(payload.new as ProductCollection);
							}
						);
						unsubItems = productItemsInstancesService.subscribeToItemsByCollection(
							collectionId,
							(payload) => {
								if (payload.eventType === 'INSERT')
									setItems((prev) => [payload.new as ProductItem, ...prev]);
								else if (payload.eventType === 'UPDATE')
									setItems((prev) =>
										prev.map((i) => (i.id === payload.new.id ? (payload.new as ProductItem) : i))
									);
								else if (payload.eventType === 'DELETE')
									setItems((prev) => prev.filter((i) => i.id !== payload.old.id));
							}
						);
					} catch {
						// ignore render-time errors
					}
				})();
				return () => {
					unsubCol?.unsubscribe();
					unsubItems?.unsubscribe();
				};
			}
		}
	}, [collectionId, proposalId, isViewMode, viewCollection]);

	// Set organisation from view mode
	useEffect(() => {
		if (isViewMode && viewOrganisation) {
			setOrganisation(viewOrganisation);
		}
	}, [isViewMode, viewOrganisation]);

	const handleSelect = (selectedId: string) => {
		if (isViewMode) return; // Don't allow selection in view mode

		const selected = collections.find((c) => c.id === selectedId) || null;
		const templateId = selected?.collection_reference ?? null;
		editor.update(() => {
			const node = $getNodeByKey(nodeKey!);
			if (node && 'setCollection' in node) {
				(node as any).setCollection(selectedId, templateId);
			}
		});
	};

	// Calculate totals
	const currentItems = items;
	const currentCollection = collection;
	const subtotal = currentItems.reduce((sum, item) => sum + item.unit_amount * item.unit_price, 0);

	// Calculate discount based on collection settings
	let discount = 0;
	let discountLabel = '';
	if (currentCollection && currentCollection.discount && currentCollection.discount_type) {
		const discountValue = parseFloat(currentCollection.discount);
		if (currentCollection.discount_type === 'percent') {
			discount = subtotal * (discountValue / 100);
			discountLabel = `${discountValue}%`;
		} else if (currentCollection.discount_type === 'fixed') {
			discount = discountValue;
			discountLabel = 'Fester Rabatt';
		}
	}

	const total = subtotal - discount;

	// Use print-friendly table when in view mode or when printing (e.g. from edit mode)
	const usePrintView = isViewMode || isPrintMode;

	if (!collectionId) {
		if (usePrintView) {
			return (
				<div className="py-4 text-neutral-500 text-center text-sm">
					Es wurde noch keine Produktkollektion ausgewählt
				</div>
			);
		}

		// Empty state: no product collection created for this proposal yet
		if (collections.length === 0) {
			return <ProductCollectionEmptyState proposalId={proposalId} />;
		}

		return (
			<Card>
				<CardHeader>
					<CardTitle>{tv('selectProductCollection')}</CardTitle>
				</CardHeader>
				<CardContent>
					<Select onValueChange={handleSelect}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Choose collection" />
						</SelectTrigger>
						<SelectContent>
							{collections.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</CardContent>
			</Card>
		);
	}

	if (!currentCollection) {
		if (usePrintView) {
			return <div className="py-4 text-neutral-500 text-sm">{tv('collectionNotFound')}</div>;
		}
		return (
			<Card>
				<CardHeader>
					<CardTitle>{tv('collectionNotFound')}</CardTitle>
				</CardHeader>
			</Card>
		);
	}

	// Print-friendly table: view mode or print media (so edit-mode print gets table, not Card)
	if (usePrintView) {
		return (
			<div className="product-collection-block mb-6">
				<div className="mb-3">
					<h3 className="text-base font-semibold text-neutral-900 mb-1">{currentCollection.name}</h3>
					{currentCollection.description && currentCollection.description.trim() !== '' && (
						<div className="text-xs text-neutral-500">{currentCollection.description}</div>
					)}
				</div>
				<table className="w-full border-collapse text-[9pt] leading-snug">
					<colgroup>
						<col style={{ width: '50%' }} />
						<col style={{ width: '10%' }} />
						<col style={{ width: '10%' }} />
						<col style={{ width: '15%' }} />
						<col style={{ width: '15%' }} />
					</colgroup>
					<thead style={{ display: 'table-header-group' }}>
						<tr className="border-b-2 border-neutral-800">
							<th className="text-left py-2 px-3 text-[10pt] font-semibold text-neutral-800">Position</th>
							<th className="text-right py-2 px-3 text-[10pt] font-semibold text-neutral-800">Menge</th>
							<th className="text-left py-2 px-3 text-[10pt] font-semibold text-neutral-800">Einheit</th>
							<th className="text-right py-2 px-3 text-[10pt] font-semibold text-neutral-800">
								Einzelpreis
							</th>
							<th className="text-right py-2 px-3 text-[10pt] font-semibold text-neutral-800">Gesamt</th>
						</tr>
					</thead>
					<tbody>
						{currentItems.map((item) => (
							<tr
								key={item.id}
								className="border-b border-neutral-200"
								style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
							>
								<td className="py-2 px-3 align-top">
									<div className="font-medium text-neutral-900">{item.name}</div>
									{item.description && item.description.trim() !== '' && (
										<div className="text-[8pt] text-neutral-500 mt-0.5">{item.description}</div>
									)}
								</td>
								<td className="py-2 px-3 text-right align-top tabular-nums">{item.unit_amount}</td>
								<td className="py-2 px-3 text-left align-top">{item.unit_type}</td>
								<td className="py-2 px-3 text-right align-top tabular-nums">
									{item.unit_price.toFixed(2)} €
								</td>
								<td className="py-2 px-3 text-right align-top font-medium tabular-nums">
									{(item.unit_amount * item.unit_price).toFixed(2)} €
								</td>
							</tr>
						))}
						{currentItems.length === 0 && (
							<tr>
								<td colSpan={5} className="text-center text-neutral-500 py-6">
									Keine Produkte in dieser Kollektion
								</td>
							</tr>
						)}
					</tbody>
					{currentItems.length > 0 && currentCollection.show_prices !== false && (
						<tfoot style={{ display: 'table-footer-group' }}>
							<tr className="border-t-2 border-neutral-800">
								<td colSpan={4} className="py-2 px-3 text-right font-medium text-neutral-700">
									Zwischensumme:
								</td>
								<td className="py-2 px-3 text-right font-medium tabular-nums">{subtotal.toFixed(2)} €</td>
							</tr>
							{discount > 0 && (
								<tr>
									<td colSpan={4} className="py-1 px-3 text-right font-medium text-neutral-700">
										Rabatt ({discountLabel}):
									</td>
									<td className="py-1 px-3 text-right font-medium tabular-nums text-red-600">
										-{discount.toFixed(2)} €
									</td>
								</tr>
							)}
							<tr className="border-t-2 border-neutral-900">
								<td colSpan={4} className="py-2 px-3 text-right text-[10pt] font-bold text-neutral-900">
									Gesamtbetrag (netto):
								</td>
								<td className="py-2 px-3 text-right text-[10pt] font-bold tabular-nums text-neutral-900">
									{total.toFixed(2)} €
								</td>
							</tr>
						</tfoot>
					)}
				</table>
			</div>
		);
	}

	// Edit mode: Card rendering
	return (
		<Card>
			<CardHeader>
				<CardTitle>{currentCollection.name}</CardTitle>
				{currentCollection.description && currentCollection.description.trim() !== '' && (
					<div className="text-sm text-muted-foreground">{currentCollection.description}</div>
				)}
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{/* Products Table */}
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b">
									<th className="text-left py-3 px-4 font-medium text-muted-foreground w-[40%]">Position</th>
									<th className="text-center py-3 px-4 font-medium text-muted-foreground">Menge</th>
									<th className="text-center py-3 px-4 font-medium text-muted-foreground">Einheit</th>
									<th className="text-right py-3 px-4 font-medium text-muted-foreground">Einzel €</th>
									<th className="text-right py-3 px-4 font-medium text-muted-foreground">Gesamt</th>
								</tr>
							</thead>
							<tbody>
								{currentItems.map((item) => (
									<tr key={item.id} className="border-b">
										<td className="py-3 px-4">
											<div className="font-medium">{item.name}</div>
											{item.description && item.description.trim() !== '' && (
												<div
													className="text-sm mt-1"
													style={{
														color: organisation?.color || 'var(--color-primary)',
													}}
												>
													{item.description}
												</div>
											)}
										</td>
										<td className="py-3 px-4 text-center">{item.unit_amount}</td>
										<td className="py-3 px-4 text-center">{item.unit_type}</td>
										<td className="py-3 px-4 text-right">{item.unit_price.toFixed(2)} €</td>
										<td className="py-3 px-4 text-right font-medium">
											{(item.unit_amount * item.unit_price).toFixed(2)} €
										</td>
									</tr>
								))}
								{currentItems.length === 0 && (
									<tr>
										<td colSpan={5} className="text-center text-muted-foreground py-8">
											No items in this collection
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					{/* Summary Section */}
					{currentItems.length > 0 && currentCollection.show_prices !== false && (
						<div className="pt-4 space-y-2">
							<div className="flex justify-between items-center">
								<span className="font-medium">Zwischensumme:</span>
								<span className="font-medium">{subtotal.toFixed(2)} €</span>
							</div>
							{discount > 0 && (
								<div className="flex justify-between items-center">
									<div className="flex items-center gap-2">
										<span className="font-medium">Rabatt:</span>
										<Badge variant="secondary" className="text-xs">
											{discountLabel}
										</Badge>
									</div>
									<span className="font-medium text-error-dark">-{discount.toFixed(2)} €</span>
								</div>
							)}
							<div className="flex justify-between items-center border-t pt-2">
								<span className="font-semibold text-lg">Gesamtbetrag (netto):</span>
								<span className="font-semibold text-lg">{total.toFixed(2)} €</span>
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export class ProductCollectionBlockNode extends DecoratorNode<React.ReactElement> {
	__collection_id: string | null;
	__template_id: string | null;

	static getType(): string {
		return 'product-collection-block';
	}

	static clone(node: ProductCollectionBlockNode): ProductCollectionBlockNode {
		return new ProductCollectionBlockNode(node.__collection_id, node.__template_id, node.__key);
	}

	static importJSON(json: SerializedProductCollectionBlockNode): ProductCollectionBlockNode {
		return new ProductCollectionBlockNode(json.collection_id || null, json.template_id || null);
	}

	exportJSON(): SerializedProductCollectionBlockNode {
		return {
			...super.exportJSON(),
			type: 'product-collection-block',
			version: 1,
			collection_id: this.__collection_id,
			template_id: this.__template_id,
		};
	}

	createDOM(): HTMLElement {
		const div = document.createElement('div');
		return div;
	}
	updateDOM(): false {
		return false;
	}
	decorate(): React.ReactElement {
		return <ProductCollectionBlock nodeKey={this.getKey()} collectionId={this.__collection_id} />;
	}

	constructor(collectionId: string | null, templateId: string | null, key?: NodeKey) {
		super(key);
		this.__collection_id = collectionId;
		this.__template_id = templateId;
	}

	setCollection(collectionId: string | null, templateId: string | null) {
		const writable = this.getWritable();
		writable.__collection_id = collectionId;
		writable.__template_id = templateId;
	}
}

export function $createProductCollectionBlockNode(
	collectionId: string | null,
	templateId: string | null
): ProductCollectionBlockNode {
	return new ProductCollectionBlockNode(collectionId, templateId);
}

export function $isProductCollectionBlockNode(
	node: LexicalNode | null | undefined
): node is ProductCollectionBlockNode {
	return node instanceof ProductCollectionBlockNode;
}
