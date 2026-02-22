'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import type { ChatMessage } from '@/lib/types';
import { Action, Actions } from './elements/actions';
import { CopyIcon, PencilEditIcon } from './icons';

export function PureMessageActions({
	message,
	isLoading,
	setMode,
}: {
	message: ChatMessage;
	isLoading: boolean;
	setMode?: (mode: 'view' | 'edit') => void;
}) {
	const t = useTranslations('common');
	const [_, copyToClipboard] = useCopyToClipboard();

	if (isLoading) {
		return null;
	}

	const textFromParts = message.parts
		?.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('\n')
		.trim();

	const handleCopy = async () => {
		if (!textFromParts) {
			toast.error(t('nothingToCopy'));
			return;
		}

		await copyToClipboard(textFromParts);
		toast.success(t('copiedToClipboard'));
	};

	// User messages get edit (on hover) and copy actions
	if (message.role === 'user') {
		return (
			<Actions className="-mr-0.5 justify-end">
				<div className="relative">
					{setMode && (
						<Action
							className="-left-10 absolute top-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/message:opacity-100"
							data-testid="message-edit-button"
							onClick={() => setMode('edit')}
							tooltip="Edit"
						>
							<PencilEditIcon />
						</Action>
					)}
					<Action onClick={handleCopy} tooltip="Copy">
						<CopyIcon />
					</Action>
				</div>
			</Actions>
		);
	}

	return (
		<Actions className="-ml-0.5">
			<Action onClick={handleCopy} tooltip="Copy">
				<CopyIcon />
			</Action>
		</Actions>
	);
}

export const MessageActions = memo(PureMessageActions, (prevProps, nextProps) => {
	if (prevProps.isLoading !== nextProps.isLoading) {
		return false;
	}

	return true;
});
