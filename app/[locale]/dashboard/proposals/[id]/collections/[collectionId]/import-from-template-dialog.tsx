'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { productCollectionsInstancesService } from '@/lib/product-collections-instances-service';
import { productCollectionsService } from '@/lib/product-collections-service';
import { productItemsService } from '@/lib/product-items-service';
import type { ProductItem, ProductCollectionTemplate, ProductItemTemplate } from '@/lib/types';

interface ImportFromTemplateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	organisationId: string;
	collectionId: string;
	onImportSuccess: (created: ProductItem[]) => void;
}

export function ImportFromTemplateDialog({
	open,
	onOpenChange,
	organisationId,
	collectionId,
	onImportSuccess,
}: ImportFromTemplateDialogProps) {
	const tProducts = useTranslations('products');
	const tCommon = useTranslations('common');

	const [templates, setTemplates] = useState<ProductCollectionTemplate[]>([]);
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
	const [templateItems, setTemplateItems] = useState<ProductItemTemplate[]>([]);
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
	const [isImporting, setIsImporting] = useState(false);
	const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
	const [isLoadingTemplateItems, setIsLoadingTemplateItems] = useState(false);

	useEffect(() => {
		if (!open || !organisationId) return;
		let cancelled = false;
		setIsLoadingTemplates(true);
		productCollectionsService
			.getCollections(organisationId)
			.then((data) => {
				if (!cancelled) {
					setTemplates(data);
					setSelectedTemplateId('');
					setTemplateItems([]);
					setSelectedItemIds(new Set());
				}
			})
			.catch(() => {
				if (!cancelled) {
					setTemplates([]);
					setSelectedTemplateId('');
					setTemplateItems([]);
					setSelectedItemIds(new Set());
					toast.error(tProducts('noTemplatesAvailable'), {
						style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
					});
				}
			})
			.finally(() => {
				if (!cancelled) setIsLoadingTemplates(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open, organisationId, tProducts]);

	useEffect(() => {
		if (!selectedTemplateId) {
			setTemplateItems([]);
			setSelectedItemIds(new Set());
			return;
		}
		let cancelled = false;
		setIsLoadingTemplateItems(true);
		productItemsService
			.getItemsByCollection(selectedTemplateId)
			.then((data) => {
				if (!cancelled) {
					setTemplateItems(data);
					setSelectedItemIds(new Set());
				}
			})
			.catch(() => {
				if (!cancelled)
					toast.error(tProducts('failedToLoadTemplateItems'), {
						style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
					});
			})
			.finally(() => {
				if (!cancelled) setIsLoadingTemplateItems(false);
			});
		return () => {
			cancelled = true;
		};
	}, [selectedTemplateId]);

	const toggleImportItem = useCallback((id: string) => {
		setSelectedItemIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const selectAllImportItems = useCallback(() => {
		setSelectedItemIds(new Set(templateItems.map((i) => i.id)));
	}, [templateItems]);

	const deselectAllImportItems = useCallback(() => {
		setSelectedItemIds(new Set());
	}, []);

	const handleImport = async () => {
		if (selectedItemIds.size === 0) {
			toast.error(tProducts('noItemsSelected'), {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
			return;
		}
		setIsImporting(true);
		try {
			const created = await productCollectionsInstancesService.copySelectedItemsFromTemplate(
				collectionId,
				Array.from(selectedItemIds),
				organisationId
			);
			onImportSuccess(created);
			toast.success(tProducts('itemsImported', { count: created.length }), {
				style: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' },
			});
			onOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to import items', {
				style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
			});
		} finally {
			setIsImporting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{tProducts('importFromTemplate')}</DialogTitle>
					<DialogDescription>{tProducts('importFromTemplateDescription')}</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label>{tProducts('selectTemplate')}</Label>
						<Select
							value={selectedTemplateId}
							onValueChange={setSelectedTemplateId}
							disabled={isLoadingTemplates}
						>
							<SelectTrigger>
								<SelectValue placeholder={tProducts('noTemplatesAvailable')} />
							</SelectTrigger>
							<SelectContent>
								{templates.map((t) => (
									<SelectItem key={t.id} value={t.id}>
										{t.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{selectedTemplateId && (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>{tProducts('selectItemsToImport')}</Label>
								<div className="flex gap-1">
									<Button type="button" variant="ghost" size="sm" onClick={selectAllImportItems}>
										{tProducts('selectAll')}
									</Button>
									<Button type="button" variant="ghost" size="sm" onClick={deselectAllImportItems}>
										{tProducts('deselectAll')}
									</Button>
								</div>
							</div>
							{isLoadingTemplateItems ? (
								<p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
							) : templateItems.length === 0 ? (
								<p className="text-sm text-muted-foreground">{tProducts('noItems')}</p>
							) : (
								<ScrollArea className="h-[240px] rounded-md border p-2">
									<div className="space-y-2">
										{templateItems.map((item) => (
											<label
												key={item.id}
												className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 hover:bg-muted/50 has-checked:bg-muted/80"
											>
												<input
													type="checkbox"
													checked={selectedItemIds.has(item.id)}
													onChange={() => toggleImportItem(item.id)}
													className="h-4 w-4 rounded border-input"
												/>
												<span className="flex-1 font-medium">{item.name}</span>
												<span className="text-muted-foreground text-sm">
													{item.unit_type} · €{Number(item.unit_price)}
												</span>
											</label>
										))}
									</div>
								</ScrollArea>
							)}
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
						{tCommon('cancel')}
					</Button>
					<Button onClick={handleImport} disabled={selectedItemIds.size === 0 || isImporting}>
						{isImporting
							? tProducts('importing')
							: tProducts('importSelected') +
								(selectedItemIds.size > 0 ? ` (${selectedItemIds.size})` : '')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
