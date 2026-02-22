'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
	LexicalTypeaheadMenuPlugin,
	MenuOption,
	useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type { TextNode } from 'lexical';
import { $getSelection, $isRangeSelection } from 'lexical';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
	getSlashCommandDefinitions,
	type EditorActionContext,
	type EditorActionDefinition,
} from './editor-actions';

class SlashCommandOption extends MenuOption {
	action: EditorActionDefinition;

	constructor(action: EditorActionDefinition) {
		super(action.id);
		this.action = action;
	}
}

function removeSlashCommandText(node: TextNode | null, matchingString: string) {
	if (!node) return;
	const selection = $getSelection();
	if (!$isRangeSelection(selection) || !selection.isCollapsed()) return;
	const anchor = selection.anchor;
	if (anchor.type !== 'text') return;
	if (anchor.getNode() !== node) return;

	const commandLength = matchingString.length + 1;
	const anchorOffset = anchor.offset;
	const startOffset = anchorOffset - commandLength;

	if (startOffset < 0) return;
	node.spliceText(startOffset, commandLength, '', true);
}

type SlashCommandPluginProps = EditorActionContext;

export function SlashCommandPlugin({ enableProductCollections }: SlashCommandPluginProps) {
	const [editor] = useLexicalComposerContext();
	const [queryString, setQueryString] = useState<string | null>(null);
	const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', { minLength: 0 });

	const options = useMemo(() => {
		if (queryString === null) return [];
		const normalizedQuery = queryString.trim().toLowerCase();
		const actions = getSlashCommandDefinitions({ enableProductCollections });

		const filtered = actions.filter(({ label, keywords }) => {
			if (normalizedQuery.length === 0) return true;
			const haystack = [label, ...keywords].join(' ').toLowerCase();
			return haystack.includes(normalizedQuery);
		});

		return filtered.map((action) => new SlashCommandOption(action));
	}, [enableProductCollections, queryString]);

	return (
		<LexicalTypeaheadMenuPlugin
			onQueryChange={setQueryString}
			triggerFn={checkForTriggerMatch}
			options={options}
			onSelectOption={(option, nodeToReplace, closeMenu, matchingString) => {
				closeMenu();
				editor.update(() => {
					removeSlashCommandText(nodeToReplace, matchingString);
				});
				option.action.perform(editor);
			}}
			menuRenderFn={(
				anchorElementRef,
				{ options, selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
			) => {
				if (!anchorElementRef.current || options.length === 0) {
					return null;
				}

				return createPortal(
					<DropdownMenu open modal={false} onOpenChange={() => {}}>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								tabIndex={-1}
								aria-hidden="true"
								className="pointer-events-none absolute left-0 top-0 h-0 w-0 opacity-0"
							/>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							id="typeahead-menu"
							side="bottom"
							align="start"
							sideOffset={6}
							className="max-h-64 w-64 overflow-y-auto p-1"
							onCloseAutoFocus={(event: Event) => event.preventDefault()}
							onFocusOutside={(event) => event.preventDefault()}
						>
							{options.map((option, index) => {
								const { label, description, icon: Icon } = option.action;
								return (
									<DropdownMenuItem
										key={option.key}
										ref={option.setRefElement}
										className={cn(
											'flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm',
											index === selectedIndex && 'bg-accent text-accent-foreground'
										)}
										tabIndex={-1}
										onMouseEnter={() => setHighlightedIndex(index)}
										onMouseDown={(event) => event.preventDefault()}
										onPointerDown={(event) => event.preventDefault()}
										onSelect={(event) => {
											event.preventDefault();
											selectOptionAndCleanUp(option);
										}}
									>
										<Icon className="mt-0.5 h-4 w-4 shrink-0" />
										<div className="flex flex-col">
											<span className="font-medium">{label}</span>
											{description && <span className="text-xs text-muted-foreground">{description}</span>}
										</div>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>,
					anchorElementRef.current
				);
			}}
		/>
	);
}
