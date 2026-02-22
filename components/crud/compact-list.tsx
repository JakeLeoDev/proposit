'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	ChevronDown,
	ChevronRight,
	Edit,
	Trash2,
	Search,
	Package,
	GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DragEndEvent } from '@dnd-kit/core';
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface CompactListItem {
	id: string;
	title: string;
	subtitle?: string;
	metadata?: Record<string, any>;
	highlightedMetadata?: Record<string, any>;
	description?: string;
}

export interface CompactListProps<T> {
	data: T[];
	renderItem: (item: T) => CompactListItem;
	onEdit: (item: T) => void;
	onDelete: (item: T) => Promise<void>;
	isLoading?: boolean;
	emptyMessage?: string;
	searchKey?: string;
	searchPlaceholder?: string;
	className?: string;
	showSearch?: boolean;
	expandable?: boolean;
	sortable?: boolean;
	onReorder?: (items: T[]) => Promise<void>;
}

export function CompactList<T extends { id: string }>({
	data,
	renderItem,
	onEdit,
	onDelete,
	isLoading = false,
	emptyMessage,
	searchKey,
	searchPlaceholder,
	className,
	showSearch = true,
	expandable = true,
	sortable = false,
	onReorder,
}: CompactListProps<T>) {
	const tCommon = useTranslations('common');

	const [searchTerm, setSearchTerm] = useState('');
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

	// Drag and drop sensors
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;

		if (!over || !onReorder || active.id === over.id) {
			return;
		}

		const oldIndex = filteredData.findIndex((item) => item.id === active.id);
		const newIndex = filteredData.findIndex((item) => item.id === over.id);

		if (oldIndex !== -1 && newIndex !== -1) {
			const reorderedItems = arrayMove(filteredData, oldIndex, newIndex);
			await onReorder(reorderedItems);
		}
	};

	// Filter data based on search term
	const filteredData =
		searchKey && searchTerm
			? data.filter((item) => {
					const searchValue = (item as any)[searchKey];
					return searchValue?.toString().toLowerCase().includes(searchTerm.toLowerCase());
				})
			: data;

	const toggleExpanded = (itemId: string) => {
		setExpandedItems((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(itemId)) {
				newSet.delete(itemId);
			} else {
				newSet.add(itemId);
			}
			return newSet;
		});
	};

	const handleDelete = async (item: T) => {
		try {
			await onDelete(item);
		} catch {
			// Error handling is done in the parent component
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<Card key={i} className="animate-pulse">
						<CardContent className="p-4">
							<div className="flex items-center justify-between">
								<div className="space-y-2">
									<div className="h-4 bg-neutral-200 rounded w-1/3"></div>
									<div className="h-3 bg-neutral-200 rounded w-1/2"></div>
								</div>
								<div className="flex gap-2">
									<div className="h-8 w-8 bg-neutral-200 rounded"></div>
									<div className="h-8 w-8 bg-neutral-200 rounded"></div>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (filteredData.length === 0) {
		return (
			<div className="text-center py-8">
				<Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
				<h3 className="text-lg font-medium text-muted-foreground mb-2">
					{searchTerm ? tCommon('noItemsMatchSearch') : emptyMessage || tCommon('noItemsFound')}
				</h3>
				{searchTerm && <p className="text-sm text-muted-foreground">{tCommon('adjustSearch')}</p>}
			</div>
		);
	}

	return (
		<div className={cn('space-y-3', className)}>
			{/* Search */}
			{showSearch && searchKey && (
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
					<Input
						placeholder={searchPlaceholder || tCommon('search')}
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10"
					/>
				</div>
			)}

			{/* Items */}
			{sortable ? (
				<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
					<SortableContext
						items={filteredData.map((item) => item.id)}
						strategy={verticalListSortingStrategy}
					>
						{filteredData.map((item) => (
							<SortableItem
								key={item.id}
								item={item}
								renderItem={renderItem}
								onEdit={onEdit}
								onDelete={handleDelete}
								expandedItems={expandedItems}
								toggleExpanded={toggleExpanded}
								expandable={expandable}
							/>
						))}
					</SortableContext>
				</DndContext>
			) : (
				filteredData.map((item) => (
					<RegularItem
						key={item.id}
						item={item}
						renderItem={renderItem}
						onEdit={onEdit}
						onDelete={handleDelete}
						expandedItems={expandedItems}
						toggleExpanded={toggleExpanded}
						expandable={expandable}
					/>
				))
			)}
		</div>
	);
}

// Sortable Item Component
function SortableItem<T extends { id: string }>({
	item,
	renderItem,
	onEdit,
	onDelete,
	expandedItems,
	toggleExpanded,
	expandable,
}: {
	item: T;
	renderItem: (item: T) => CompactListItem;
	onEdit: (item: T) => void;
	onDelete: (item: T) => Promise<void>;
	expandedItems: Set<string>;
	toggleExpanded: (itemId: string) => void;
	expandable: boolean;
}) {
	const tCrud = useTranslations('crud');
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: item.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const itemData = renderItem(item);
	const isExpanded = expandedItems.has(item.id);
	const hasDescription = itemData.description && itemData.description.trim().length > 0;

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className={cn('transition-all hover:shadow-md', isDragging && 'opacity-50 border-primary')}
		>
			<Collapsible open={isExpanded} onOpenChange={() => expandable && toggleExpanded(item.id)}>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3 flex-1 min-w-0">
							{/* Drag Handle */}
							<div
								{...attributes}
								{...listeners}
								className="cursor-grab active:cursor-grabbing p-1 hover:bg-neutral-100 rounded"
							>
								<GripVertical className="h-4 w-4 text-muted-foreground" />
							</div>

							{expandable && hasDescription && (
								<CollapsibleTrigger asChild>
									<div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
										<div className="h-6 w-6 flex items-center justify-center">
											{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
										</div>
										<div className="flex-1 min-w-0">
											<h3 className="font-medium text-sm truncate">{itemData.title}</h3>
											{itemData.subtitle && (
												<p className="text-sm text-muted-foreground truncate">{itemData.subtitle}</p>
											)}

											{/* Metadata badges */}
											{itemData.metadata && Object.keys(itemData.metadata).length > 0 && (
												<div className="flex gap-1 mt-1">
													{Object.entries(itemData.metadata).map(([key, value]) => (
														<Badge key={key} variant="secondary" className="text-xs">
															{key}: {value}
														</Badge>
													))}
												</div>
											)}
										</div>
									</div>
								</CollapsibleTrigger>
							)}

							{(!expandable || !hasDescription) && (
								<div className="flex-1 min-w-0">
									<h3 className="font-medium text-sm truncate">{itemData.title}</h3>
									{itemData.subtitle && (
										<p className="text-sm text-muted-foreground truncate">{itemData.subtitle}</p>
									)}

									{/* Metadata badges */}
									{itemData.metadata && Object.keys(itemData.metadata).length > 0 && (
										<div className="flex gap-1 mt-1">
											{Object.entries(itemData.metadata).map(([key, value]) => (
												<Badge key={key} variant="secondary" className="text-xs">
													{key}: {value}
												</Badge>
											))}
										</div>
									)}
								</div>
							)}
						</div>

						{/* Highlighted metadata badges in center */}
						{itemData.highlightedMetadata && Object.keys(itemData.highlightedMetadata).length > 0 && (
							<div className="flex gap-1 mx-4">
								{Object.entries(itemData.highlightedMetadata).map(([key, value]) => (
									<Badge
										key={key}
										variant="default"
										className="text-xs font-semibold bg-primary text-primary-foreground"
									>
										{key}: {value}
									</Badge>
								))}
							</div>
						)}

						<div className="flex items-center gap-2">
							<Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="h-8 w-8 p-0">
								<Edit className="h-4 w-4" />
							</Button>

							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 w-8 p-0 text-destructive hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>{tCrud('deleteItem')}</AlertDialogTitle>
										<AlertDialogDescription>{tCrud('confirmDelete')}</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>{tCrud('cancel')}</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => onDelete(item)}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											{tCrud('deleteItem')}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</div>

					{/* Expandable description */}
					{expandable && hasDescription && (
						<CollapsibleContent className="mt-3">
							<div className="text-sm text-muted-foreground border-t pt-3">{itemData.description}</div>
						</CollapsibleContent>
					)}
				</CardContent>
			</Collapsible>
		</Card>
	);
}

// Regular Item Component (non-sortable)
function RegularItem<T extends { id: string }>({
	item,
	renderItem,
	onEdit,
	onDelete,
	expandedItems,
	toggleExpanded,
	expandable,
}: {
	item: T;
	renderItem: (item: T) => CompactListItem;
	onEdit: (item: T) => void;
	onDelete: (item: T) => Promise<void>;
	expandedItems: Set<string>;
	toggleExpanded: (itemId: string) => void;
	expandable: boolean;
}) {
	const tCrud = useTranslations('crud');
	const itemData = renderItem(item);
	const isExpanded = expandedItems.has(item.id);
	const hasDescription = itemData.description && itemData.description.trim().length > 0;

	return (
		<Card className="transition-all hover:shadow-md">
			<Collapsible open={isExpanded} onOpenChange={() => expandable && toggleExpanded(item.id)}>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3 flex-1 min-w-0">
							{expandable && hasDescription && (
								<CollapsibleTrigger asChild>
									<div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
										<div className="h-6 w-6 flex items-center justify-center">
											{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
										</div>
										<div className="flex-1 min-w-0">
											<h3 className="font-medium text-sm truncate">{itemData.title}</h3>
											{itemData.subtitle && (
												<p className="text-sm text-muted-foreground truncate">{itemData.subtitle}</p>
											)}

											{/* Metadata badges */}
											{itemData.metadata && Object.keys(itemData.metadata).length > 0 && (
												<div className="flex gap-1 mt-1">
													{Object.entries(itemData.metadata).map(([key, value]) => (
														<Badge key={key} variant="secondary" className="text-xs">
															{key}: {value}
														</Badge>
													))}
												</div>
											)}
										</div>
									</div>
								</CollapsibleTrigger>
							)}

							{(!expandable || !hasDescription) && (
								<div className="flex-1 min-w-0">
									<h3 className="font-medium text-sm truncate">{itemData.title}</h3>
									{itemData.subtitle && (
										<p className="text-sm text-muted-foreground truncate">{itemData.subtitle}</p>
									)}

									{/* Metadata badges */}
									{itemData.metadata && Object.keys(itemData.metadata).length > 0 && (
										<div className="flex gap-1 mt-1">
											{Object.entries(itemData.metadata).map(([key, value]) => (
												<Badge key={key} variant="secondary" className="text-xs">
													{key}: {value}
												</Badge>
											))}
										</div>
									)}
								</div>
							)}
						</div>

						{/* Highlighted metadata badges in center */}
						{itemData.highlightedMetadata && Object.keys(itemData.highlightedMetadata).length > 0 && (
							<div className="flex gap-1 mx-4">
								{Object.entries(itemData.highlightedMetadata).map(([key, value]) => (
									<Badge
										key={key}
										variant="default"
										className="text-xs font-semibold bg-primary text-primary-foreground"
									>
										{key}: {value}
									</Badge>
								))}
							</div>
						)}

						<div className="flex items-center gap-2">
							<Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="h-8 w-8 p-0">
								<Edit className="h-4 w-4" />
							</Button>

							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 w-8 p-0 text-destructive hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>{tCrud('deleteItem')}</AlertDialogTitle>
										<AlertDialogDescription>{tCrud('confirmDelete')}</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>{tCrud('cancel')}</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => onDelete(item)}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											{tCrud('deleteItem')}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</div>

					{/* Expandable description */}
					{expandable && hasDescription && (
						<CollapsibleContent className="mt-3">
							<div className="text-sm text-muted-foreground border-t pt-3">{itemData.description}</div>
						</CollapsibleContent>
					)}
				</CardContent>
			</Collapsible>
		</Card>
	);
}
