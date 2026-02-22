'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import {
	FORMAT_TEXT_COMMAND,
	COMMAND_PRIORITY_EDITOR,
	$getSelection,
	$isRangeSelection,
	UNDO_COMMAND,
	REDO_COMMAND,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useTranslations } from 'next-intl';

import { $createHeadingNode, type HeadingTagType } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';

import { $toggleLink } from '@lexical/link';
import { $createImageNode } from './nodes/ImageNode';
import { useEditorProposalContext } from './editor-context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
	Bold,
	Italic,
	Underline,
	Code,
	Image as ImageIcon,
	IndentDecrease,
	IndentIncrease,
	Link,
	Undo,
	Redo,
	Maximize2,
	Minimize2,
} from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { Input } from '@/components/ui/input';
import {
	BULLETED_LIST_ACTION,
	CHANGE_HEADING_COMMAND,
	HEADING_OPTIONS,
	INDENT_LIST_ACTION,
	NUMBERED_LIST_ACTION,
	OUTDENT_LIST_ACTION,
	PARAGRAPH_ACTION,
	PRODUCT_COLLECTION_ACTION,
	QUOTE_ACTION,
	TABLE_ACTION,
} from './editor-actions';

interface ToolbarProps {
	topSpacing?: number;
	enableProductCollections?: boolean;
	onToggleFullscreen?: () => void;
	isFullscreen?: boolean;
}

export function Toolbar({
	enableProductCollections = false,
	onToggleFullscreen,
	isFullscreen = false,
	topSpacing,
}: ToolbarProps) {
	const [editor] = useLexicalComposerContext();
	const t = useTranslations('editor');
	const { proposalId } = useEditorProposalContext();
	const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
	const [linkUrl, setLinkUrl] = useState('');
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [isTablePickerOpen, setIsTablePickerOpen] = useState(false);
	const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

	useEffect(() => {
		// Register heading command
		const remove = editor.registerCommand<HeadingTagType>(
			CHANGE_HEADING_COMMAND,
			(tag) => {
				editor.update(() => {
					const sel = $getSelection();
					if ($isRangeSelection(sel)) {
						$setBlocksType(sel, () => $createHeadingNode(tag));
					}
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR
		);
		return remove;
	}, [editor]);

	const actionContext = { enableProductCollections };
	const ParagraphIcon = PARAGRAPH_ACTION.icon;
	const QuoteIcon = QUOTE_ACTION.icon;
	const BulletedListIcon = BULLETED_LIST_ACTION.icon;
	const NumberedListIcon = NUMBERED_LIST_ACTION.icon;
	const ProductCollectionIcon = PRODUCT_COLLECTION_ACTION.icon;
	const TableIcon = TABLE_ACTION.icon;

	const applyLink = () => {
		editor.update(() => {
			const sel = $getSelection();
			if ($isRangeSelection(sel)) {
				$toggleLink(linkUrl || null);
			}
		});
		setIsLinkDialogOpen(false);
		setLinkUrl('');
	};

	const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const supabase = createClient();
		// Determine organisation folder for upload
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			e.target.value = '';
			return;
		}
		const { data: membership } = await supabase
			.from('organisation_users')
			.select('organisation_id')
			.eq('user_id', user.id)
			.single();
		const organisationId = membership?.organisation_id;
		if (!organisationId) {
			e.target.value = '';
			return;
		}

		const fileExt = file.name.split('.').pop();
		const filePath = `organisations/${organisationId}/editor-images/${Date.now()}.${fileExt}`;
		const { error } = await supabase.storage.from('Media').upload(filePath, file, { upsert: true });
		if (!error) {
			// Track the image in proposal_images if we have a proposal context
			if (proposalId) {
				await supabase.from('proposal_images').insert({
					proposal_id: proposalId,
					organisation_id: organisationId,
					storage_path: filePath,
				});
			}

			editor.update(() => {
				const sel = $getSelection();
				if ($isRangeSelection(sel)) {
					sel.insertNodes([$createImageNode(filePath, file.name)]);
				}
			});
		}
		e.target.value = '';
	};

	const handleImageButtonClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div
			className="sticky z-1 flex flex-wrap items-center justify-between gap-1 rounded-t-md border-b border-input bg-background/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
			style={{ top: `${topSpacing && !isFullscreen ? topSpacing : 0}px` }}
		>
			{/* Left side - Main formatting tools */}
			<div className="flex items-center gap-1">
				{/* Text formatting */}
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
						title="Bold"
					>
						<Bold className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
						title="Italic"
					>
						<Italic className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
						title="Underline"
					>
						<Underline className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
						title="Code"
					>
						<Code className="h-4 w-4" />
					</Button>
				</div>

				<Separator orientation="vertical" className="h-6" />

				{/* Headings */}
				<div className="flex items-center gap-1">
					{HEADING_OPTIONS.map(({ id, icon: Icon, label, perform }) => (
						<Button
							key={id}
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => perform(editor)}
							title={label}
						>
							<Icon className="h-4 w-4" />
						</Button>
					))}
				</div>

				<Separator orientation="vertical" className="h-6" />

				{/* Paragraph */}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => PARAGRAPH_ACTION.perform(editor)}
					title={PARAGRAPH_ACTION.label}
				>
					<ParagraphIcon className="h-4 w-4" />
				</Button>

				<Separator orientation="vertical" className="h-6" />

				{/* Quote block */}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => QUOTE_ACTION.perform(editor)}
					title={QUOTE_ACTION.label}
				>
					<QuoteIcon className="h-4 w-4" />
				</Button>

				<Separator orientation="vertical" className="h-6" />

				{/* Lists */}
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => BULLETED_LIST_ACTION.perform(editor)}
						title={BULLETED_LIST_ACTION.label}
					>
						<BulletedListIcon className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => NUMBERED_LIST_ACTION.perform(editor)}
						title={NUMBERED_LIST_ACTION.label}
					>
						<NumberedListIcon className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => INDENT_LIST_ACTION.perform(editor)}
						title={INDENT_LIST_ACTION.label}
					>
						<IndentIncrease className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => OUTDENT_LIST_ACTION.perform(editor)}
						title={OUTDENT_LIST_ACTION.label}
					>
						<IndentDecrease className="h-4 w-4" />
					</Button>
				</div>

				<Separator orientation="vertical" className="h-6" />

				{/* Table grid picker */}
				<Popover open={isTablePickerOpen} onOpenChange={setIsTablePickerOpen}>
					<PopoverTrigger asChild>
						<Button type="button" variant="ghost" size="sm" title={TABLE_ACTION.label}>
							<TableIcon className="h-4 w-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-3" align="start">
						<p className="mb-2 text-xs font-medium text-muted-foreground">
							{hoveredCell ? `${hoveredCell.row} × ${hoveredCell.col}` : 'Tabelle einfügen'}
						</p>
						<div
							className="grid gap-0.5"
							style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}
							onMouseLeave={() => setHoveredCell(null)}
						>
							{Array.from({ length: 6 }, (_, row) =>
								Array.from({ length: 6 }, (_, col) => (
									<button
										key={`${row}-${col}`}
										type="button"
										className={`h-5 w-5 rounded-sm border transition-colors ${
											hoveredCell && row < hoveredCell.row && col < hoveredCell.col
												? 'border-primary bg-primary/20'
												: 'border-border bg-background hover:border-primary/50'
										}`}
										onMouseEnter={() => setHoveredCell({ row: row + 1, col: col + 1 })}
										onClick={() => {
											editor.dispatchCommand(INSERT_TABLE_COMMAND, {
												columns: String(col + 1),
												rows: String(row + 1),
												includeHeaders: true,
											});
											setIsTablePickerOpen(false);
											setHoveredCell(null);
										}}
									/>
								))
							)}
						</div>
					</PopoverContent>
				</Popover>

				<Separator orientation="vertical" className="h-6" />

				{/* Link toggle */}
				<AlertDialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
					<AlertDialogTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							title="Link"
							onClick={() => setIsLinkDialogOpen(true)}
						>
							<Link className="h-4 w-4" />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{t('insertLink')}</AlertDialogTitle>
							<AlertDialogDescription>Enter the URL to apply to the selected text.</AlertDialogDescription>
						</AlertDialogHeader>
						<Input
							placeholder="https://example.com"
							value={linkUrl}
							onChange={(e) => setLinkUrl(e.target.value)}
						/>
						<AlertDialogFooter>
							<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
							<AlertDialogAction onClick={applyLink}>{t('apply')}</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<Separator orientation="vertical" className="h-6" />

				{/* Insert image */}
				<div className="flex items-center">
					<input
						type="file"
						accept="image/*"
						ref={fileInputRef}
						className="hidden"
						onChange={handleImageUpload}
					/>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleImageButtonClick}
						title="Insert Image"
					>
						<ImageIcon className="h-4 w-4" />
					</Button>
				</div>

				<Separator orientation="vertical" className="h-6" />

				{/* Insert product collection block */}
				{PRODUCT_COLLECTION_ACTION.isAvailable?.(actionContext) && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => PRODUCT_COLLECTION_ACTION.perform(editor)}
						title={PRODUCT_COLLECTION_ACTION.label}
					>
						<ProductCollectionIcon className="h-4 w-4" />
					</Button>
				)}
			</div>

			{/* Right side - History controls */}
			<div className="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
					title="Undo"
				>
					<Undo className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
					title="Redo"
				>
					<Redo className="h-4 w-4" />
				</Button>
				{onToggleFullscreen && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onToggleFullscreen}
						title={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
					>
						{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
					</Button>
				)}
			</div>
		</div>
	);
}
