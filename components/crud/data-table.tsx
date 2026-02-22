'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Plus, Search, Edit, Trash2, Eye, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
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

export interface DataTableColumn<T> {
	key: keyof T | string;
	label: string;
	render?: (value: any, item: T) => React.ReactNode;
	sortable?: boolean;
	width?: string;
}

export interface DataTableProps<T> {
	title: string;
	description?: string;
	data: T[];
	columns: DataTableColumn<T>[];
	isLoading?: boolean;
	error?: string | null;
	searchPlaceholder?: string;
	searchKey?: keyof T;
	onSearch?: (query: string) => void;
	onCreate?: () => void;
	onEdit?: (item: T) => void;
	onDelete?: (item: T) => void;
	onView?: (item: T) => void;
	onPreview?: (item: T) => void;
	createButtonText?: string;
	emptyMessage?: string;
	className?: string;
	idKey?: keyof T;
	hrefPrefix?: string;
}

export function DataTable<T extends Record<string, any>>({
	title,
	description,
	data,
	columns,
	isLoading = false,
	error = null,
	searchPlaceholder,
	searchKey,
	onSearch,
	onCreate,
	onEdit,
	onDelete,
	onView,
	onPreview,
	createButtonText,
	emptyMessage,
	className,
	idKey = 'id' as keyof T,
	hrefPrefix,
}: DataTableProps<T>) {
	const t = useTranslations('common');
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState('');
	const [filteredData, setFilteredData] = useState<T[]>(data);

	useEffect(() => {
		if (onSearch && searchQuery) {
			onSearch(searchQuery);
		} else if (searchKey && searchQuery) {
			const filtered = data.filter((item) => {
				const value = item[searchKey];
				return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase());
			});
			setFilteredData(filtered);
		} else {
			setFilteredData(data);
		}
	}, [data, searchQuery, searchKey, onSearch]);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
	};

	const handleRowClick = (item: T) => {
		if (hrefPrefix) {
			router.push(`${hrefPrefix}/${item[idKey]}`);
		}
	};

	const handleActionClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	const renderCell = (column: DataTableColumn<T>, item: T) => {
		const value = column.key === 'id' ? item[column.key] : item[column.key as keyof T];

		if (column.render) {
			return column.render(value, item);
		}

		// Default rendering
		if (typeof value === 'string') {
			return <span className="truncate">{value}</span>;
		}
		if (typeof value === 'number') {
			return <span>{value}</span>;
		}
		if (value && typeof value === 'object' && (value as any) instanceof Date) {
			return <span>{(value as Date).toLocaleDateString()}</span>;
		}
		if (typeof value === 'boolean') {
			return <Badge variant={value ? 'default' : 'secondary'}>{value ? t('yes') : t('no')}</Badge>;
		}

		return <span className="text-muted-foreground">-</span>;
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	return (
		<div className={cn('space-y-6', className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{title}</h1>
					{description && <p className="text-muted-foreground">{description}</p>}
				</div>
				{onCreate && (
					<Button onClick={onCreate}>
						<Plus className="h-4 w-4 mr-2" />
						{createButtonText || t('create')}
					</Button>
				)}
			</div>

			{/* Error Alert */}
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>{t('error')}</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Search and Table */}
			<div>
				{/* Search */}
				{(onSearch || searchKey) && (
					<div className="mb-6">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
							<Input
								placeholder={searchPlaceholder || t('search')}
								value={searchQuery}
								onChange={handleSearchChange}
								className="pl-10"
							/>
						</div>
					</div>
				)}

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b">
								{columns.map((column) => (
									<th
										key={String(column.key)}
										className={cn('text-left py-3 px-4 font-medium text-muted-foreground', column.width)}
									>
										{column.label}
									</th>
								))}
								{(onEdit || onDelete || onView || onPreview) && (
									<th className="text-right py-3 px-4 font-medium text-muted-foreground w-24">
										{t('actions')}
									</th>
								)}
							</tr>
						</thead>
						<tbody>
							{filteredData.length === 0 ? (
								<tr>
									<td
										colSpan={columns.length + (onEdit || onDelete || onView || onPreview ? 1 : 0)}
										className="text-center py-8 text-muted-foreground"
									>
										{emptyMessage || t('noDataAvailable')}
									</td>
								</tr>
							) : (
								filteredData.map((item, index) => (
									<tr
										key={String(item[idKey])}
										className={cn(
											'border-b hover:bg-muted/50 transition-colors cursor-pointer',
											index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
										)}
										onClick={() => handleRowClick(item)}
									>
										{columns.map((column) => (
											<td key={String(column.key)} className={cn('py-3 px-4', column.width)}>
												{renderCell(column, item)}
											</td>
										))}
										{(onEdit || onDelete || onView || onPreview) && (
											<td className="text-right py-3 px-4">
												<div
													className="flex items-center justify-end gap-2"
													role="toolbar"
													tabIndex={-1}
													onClick={handleActionClick}
													onKeyDown={(e) => e.stopPropagation()}
												>
													{onPreview && (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => onPreview(item)}
															title={t('preview')}
															className="cursor-pointer"
														>
															<Eye className="h-4 w-4" />
														</Button>
													)}
													{onView && (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => onView(item)}
															title={t('preview')}
															className="cursor-pointer"
														>
															<Eye className="h-4 w-4" />
														</Button>
													)}
													{hrefPrefix && (
														<Link href={`${hrefPrefix}/${item[idKey]}`}>
															<Button variant="ghost" size="sm" title={t('edit')} className="cursor-pointer">
																<Edit className="h-4 w-4" />
															</Button>
														</Link>
													)}
													{onEdit && !hrefPrefix && (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => onEdit(item)}
															title={t('edit')}
															className="cursor-pointer"
														>
															<Edit className="h-4 w-4" />
														</Button>
													)}
													{onDelete && (
														<AlertDialog>
															<AlertDialogTrigger asChild>
																<Button variant="ghost" size="sm" title={t('delete')} className="cursor-pointer">
																	<Trash2 className="h-4 w-4" />
																</Button>
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>{t('delete')}?</AlertDialogTitle>
																	<AlertDialogDescription>{t('delete')}?</AlertDialogDescription>
																</AlertDialogHeader>
																<AlertDialogFooter>
																	<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
																	<AlertDialogAction onClick={() => onDelete(item)}>{t('delete')}</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													)}
												</div>
											</td>
										)}
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
