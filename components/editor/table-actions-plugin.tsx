'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, $getNodeByKey, type LexicalNode } from 'lexical';
import {
	$isTableCellNode,
	$isTableNode,
	$isTableRowNode,
	$getTableCellNodeFromLexicalNode,
	$getTableRowIndexFromTableCellNode,
	$getTableColumnIndexFromTableCellNode,
	$insertTableRow__EXPERIMENTAL,
	$insertTableColumn__EXPERIMENTAL,
	$deleteTableRow__EXPERIMENTAL,
	$deleteTableColumn__EXPERIMENTAL,
	TableCellHeaderStates,
	type TableCellNode,
} from '@lexical/table';
import { createPortal } from 'react-dom';
import {
	Plus,
	Trash2,
	ArrowUp,
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ChevronDown,
	ToggleLeft,
} from 'lucide-react';

interface TableRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

interface CellInfo {
	tableCellNode: TableCellNode;
	tableNodeKey: string;
	rowIndex: number;
	colIndex: number;
	rowCount: number;
	colCount: number;
	hasHeaderRow: boolean;
}

function getTableElementFromCell(cellElement: HTMLElement): HTMLTableElement | null {
	let el: HTMLElement | null = cellElement;
	while (el) {
		if (el.tagName === 'TABLE') return el as HTMLTableElement;
		el = el.parentElement;
	}
	return null;
}

export function TableActionsPlugin() {
	const [editor] = useLexicalComposerContext();
	const t = useTranslations('editor');
	const [cellInfo, setCellInfo] = useState<CellInfo | null>(null);
	const [tableRect, setTableRect] = useState<TableRect | null>(null);
	const [showDropdown, setShowDropdown] = useState(false);
	const [isHoveringTable, setIsHoveringTable] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const dropdownBtnRef = useRef<HTMLButtonElement>(null);

	// Track the active table cell
	const updateCellInfo = useCallback(() => {
		editor.getEditorState().read(() => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection)) {
				setCellInfo(null);
				setTableRect(null);
				return;
			}

			const anchorNode = selection.anchor.getNode();
			const tableCellNode = $getTableCellNodeFromLexicalNode(anchorNode);

			if (!tableCellNode || !$isTableCellNode(tableCellNode)) {
				setCellInfo(null);
				setTableRect(null);
				return;
			}

			const tableRowNode = tableCellNode.getParent();
			if (!tableRowNode) return;
			const tableNode = tableRowNode.getParent();
			if (!tableNode || !$isTableNode(tableNode)) return;

			const rowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);
			const colIndex = $getTableColumnIndexFromTableCellNode(tableCellNode);
			const rows = tableNode.getChildren();
			const rowCount = rows.length;
			const firstRow = rows[0];
			const colCount = firstRow && $isTableRowNode(firstRow) ? firstRow.getChildrenSize() : 0;

			// Check if first row has header cells
			const firstCell = firstRow && $isTableRowNode(firstRow) ? firstRow.getFirstChild() : null;
			const hasHeaderRow = firstCell ? $isTableCellNode(firstCell) && firstCell.hasHeader() : false;

			setCellInfo({
				tableCellNode,
				tableNodeKey: tableNode.getKey(),
				rowIndex,
				colIndex,
				rowCount,
				colCount,
				hasHeaderRow,
			});

			// Get table element rect
			const cellElement = editor.getElementByKey(tableCellNode.getKey());
			if (cellElement) {
				const tableElement = getTableElementFromCell(cellElement);
				if (tableElement) {
					const rect = tableElement.getBoundingClientRect();
					setTableRect({
						top: rect.top,
						left: rect.left,
						width: rect.width,
						height: rect.height,
					});
				}
			}
		});
	}, [editor]);

	useEffect(() => {
		return editor.registerUpdateListener(() => {
			updateCellInfo();
		});
	}, [editor, updateCellInfo]);

	// Close dropdown on outside click
	useEffect(() => {
		if (!showDropdown) return;
		const handleClick = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node) &&
				dropdownBtnRef.current &&
				!dropdownBtnRef.current.contains(e.target as Node)
			) {
				setShowDropdown(false);
			}
		};
		document.addEventListener('mousedown', handleClick);
		return () => document.removeEventListener('mousedown', handleClick);
	}, [showDropdown]);

	// Track mouse hover over table element for edge buttons
	useEffect(() => {
		if (!cellInfo) return;

		const handleMouseMove = (e: MouseEvent) => {
			editor.getEditorState().read(() => {
				const tableNode = $getNodeByKey(cellInfo.tableNodeKey);
				if (!tableNode) return;
				const tableElement = editor.getElementByKey(cellInfo.tableNodeKey);
				if (!tableElement) return;
				const parent = getTableElementFromCell(tableElement as HTMLElement) || tableElement;
				const rect = parent.getBoundingClientRect();
				const margin = 40;
				const isNear =
					e.clientX >= rect.left - margin &&
					e.clientX <= rect.right + margin &&
					e.clientY >= rect.top - margin &&
					e.clientY <= rect.bottom + margin;
				setIsHoveringTable(isNear);
			});
		};

		document.addEventListener('mousemove', handleMouseMove);
		return () => document.removeEventListener('mousemove', handleMouseMove);
	}, [editor, cellInfo]);

	const insertRowAbove = () => {
		editor.update(() => {
			$insertTableRow__EXPERIMENTAL(false);
		});
		setShowDropdown(false);
	};
	const insertRowBelow = () => {
		editor.update(() => {
			$insertTableRow__EXPERIMENTAL(true);
		});
		setShowDropdown(false);
	};
	const insertColumnLeft = () => {
		editor.update(() => {
			$insertTableColumn__EXPERIMENTAL(false);
		});
		setShowDropdown(false);
	};
	const insertColumnRight = () => {
		editor.update(() => {
			$insertTableColumn__EXPERIMENTAL(true);
		});
		setShowDropdown(false);
	};
	const deleteRow = () => {
		editor.update(() => {
			$deleteTableRow__EXPERIMENTAL();
		});
		setShowDropdown(false);
	};
	const deleteColumn = () => {
		editor.update(() => {
			$deleteTableColumn__EXPERIMENTAL();
		});
		setShowDropdown(false);
	};
	const deleteTable = () => {
		editor.update(() => {
			const tableNode = $getNodeByKey(cellInfo?.tableNodeKey || '');
			if (tableNode) tableNode.remove();
		});
		setShowDropdown(false);
		setCellInfo(null);
	};

	const toggleHeaderRow = () => {
		editor.update(() => {
			const tableNode = $getNodeByKey(cellInfo?.tableNodeKey || '');
			if (!tableNode || !$isTableNode(tableNode)) return;
			const firstRow = tableNode.getFirstChild();
			if (!firstRow || !$isTableRowNode(firstRow)) return;
			const cells = firstRow.getChildren();
			cells.forEach((cell: LexicalNode) => {
				if ($isTableCellNode(cell)) {
					cell.toggleHeaderStyle(TableCellHeaderStates.ROW);
				}
			});
		});
		setShowDropdown(false);
	};

	if (!cellInfo || !tableRect) return null;

	const cellElement = editor.getElementByKey(cellInfo.tableCellNode.getKey());
	if (!cellElement) return null;
	const cellRect = cellElement.getBoundingClientRect();

	return createPortal(
		<>
			{/* Cell action dropdown trigger — small chevron at top-right of active cell */}
			<button
				ref={dropdownBtnRef}
				type="button"
				className="fixed z-50 flex h-5 w-5 items-center justify-center rounded bg-background border border-border shadow-sm hover:bg-muted transition-colors"
				style={{
					top: cellRect.top + 2,
					left: cellRect.right - 22,
				}}
				onClick={() => setShowDropdown(!showDropdown)}
				title="Tabellenaktionen"
			>
				<ChevronDown className="h-3 w-3 text-muted-foreground" />
			</button>

			{/* Dropdown menu */}
			{showDropdown && (
				<div
					ref={dropdownRef}
					className="fixed z-[60] min-w-[180px] rounded-md border border-border bg-background p-1 shadow-lg"
					style={{
						top: cellRect.top + 24,
						left: cellRect.right - 180,
					}}
				>
					<p className="px-2 py-1 text-xs font-medium text-muted-foreground">{t('rows')}</p>
					<DropdownItem
						icon={<ArrowUp className="h-3.5 w-3.5" />}
						label="Zeile darüber"
						onClick={insertRowAbove}
					/>
					<DropdownItem
						icon={<ArrowDown className="h-3.5 w-3.5" />}
						label="Zeile darunter"
						onClick={insertRowBelow}
					/>
					<DropdownItem
						icon={<Trash2 className="h-3.5 w-3.5" />}
						label="Zeile löschen"
						onClick={deleteRow}
						destructive
					/>
					<div className="my-1 h-px bg-border" />
					<p className="px-2 py-1 text-xs font-medium text-muted-foreground">{t('columns')}</p>
					<DropdownItem
						icon={<ArrowLeft className="h-3.5 w-3.5" />}
						label="Spalte links"
						onClick={insertColumnLeft}
					/>
					<DropdownItem
						icon={<ArrowRight className="h-3.5 w-3.5" />}
						label="Spalte rechts"
						onClick={insertColumnRight}
					/>
					<DropdownItem
						icon={<Trash2 className="h-3.5 w-3.5" />}
						label="Spalte löschen"
						onClick={deleteColumn}
						destructive
					/>
					<div className="my-1 h-px bg-border" />
					<DropdownItem
						icon={<ToggleLeft className="h-3.5 w-3.5" />}
						label={cellInfo.hasHeaderRow ? 'Kopfzeile entfernen' : 'Kopfzeile aktivieren'}
						onClick={toggleHeaderRow}
					/>
					<div className="my-1 h-px bg-border" />
					<DropdownItem
						icon={<Trash2 className="h-3.5 w-3.5" />}
						label="Tabelle löschen"
						onClick={deleteTable}
						destructive
					/>
				</div>
			)}

			{/* Edge button: add row (bottom) */}
			{isHoveringTable && (
				<button
					type="button"
					className="fixed z-50 flex h-5 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
					style={{
						top: tableRect.top + tableRect.height + 2,
						left: tableRect.left + tableRect.width / 2 - 30,
						width: 60,
					}}
					onClick={() => {
						// Move to last row first, then insert below
						editor.update(() => {
							$insertTableRow__EXPERIMENTAL(true);
						});
					}}
					title="Zeile hinzufügen"
				>
					<Plus className="h-3 w-3" />
				</button>
			)}

			{/* Edge button: add column (right) */}
			{isHoveringTable && (
				<button
					type="button"
					className="fixed z-50 flex w-5 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
					style={{
						top: tableRect.top + tableRect.height / 2 - 30,
						left: tableRect.left + tableRect.width + 2,
						height: 60,
					}}
					onClick={() => {
						editor.update(() => {
							$insertTableColumn__EXPERIMENTAL(true);
						});
					}}
					title="Spalte hinzufügen"
				>
					<Plus className="h-3 w-3" />
				</button>
			)}
		</>,
		document.body
	);
}

function DropdownItem({
	icon,
	label,
	onClick,
	destructive = false,
}: {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	destructive?: boolean;
}) {
	return (
		<button
			type="button"
			className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors ${
				destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-muted'
			}`}
			onClick={onClick}
		>
			{icon}
			{label}
		</button>
	);
}
