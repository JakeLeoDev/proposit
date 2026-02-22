'use client';

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, KEY_TAB_COMMAND, COMMAND_PRIORITY_HIGH } from 'lexical';
import { $isListItemNode } from '@lexical/list';

/**
 * Plugin to handle Tab key for list indentation/outdentation
 * Prevents Tab from moving focus to next input when in a list item
 */
export function ListIndentPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerCommand(
			KEY_TAB_COMMAND,
			(event: KeyboardEvent | null) => {
				const selection = $getSelection();

				if (!$isRangeSelection(selection)) {
					return false;
				}

				// Check if we're in a list item (outside update for early return)
				const anchorNode = selection.anchor.getNode();
				let listItemNode = anchorNode;
				while (listItemNode && !$isListItemNode(listItemNode)) {
					const parent = listItemNode.getParent();
					if (!parent) {
						return false; // Let default Tab behavior happen
					}
					listItemNode = parent;
				}

				if (!listItemNode || !$isListItemNode(listItemNode)) {
					return false; // Let default Tab behavior happen
				}

				// Prevent default Tab behavior
				if (event) {
					event.preventDefault();
				}

				// Handle indentation using indent property
				// Note: We need to get the node again inside update() to get the latest version
				editor.update(() => {
					const currentSelection = $getSelection();
					if (!$isRangeSelection(currentSelection)) return;

					const currentAnchorNode = currentSelection.anchor.getNode();
					let currentListItemNode = currentAnchorNode;
					while (currentListItemNode && !$isListItemNode(currentListItemNode)) {
						const parent = currentListItemNode.getParent();
						if (!parent) return;
						currentListItemNode = parent;
					}

					if (!currentListItemNode || !$isListItemNode(currentListItemNode)) return;

					const currentIndent = currentListItemNode.getIndent();
					if (event?.shiftKey) {
						// Shift+Tab = outdent
						currentListItemNode.setIndent(Math.max(0, currentIndent - 1));
					} else {
						// Tab = indent
						currentListItemNode.setIndent(currentIndent + 1);
					}
				});

				return true; // Command handled
			},
			COMMAND_PRIORITY_HIGH
		);
	}, [editor]);

	return null;
}
