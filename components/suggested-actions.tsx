'use client';

import type { UseChatHelpers } from '@ai-sdk/react';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { useTranslations } from 'next-intl';
import type { ChatMessage } from '@/lib/types';
import { Suggestion } from './elements/suggestion';

type SuggestedActionsProps = {
	sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
};

function PureSuggestedActions({ sendMessage }: SuggestedActionsProps) {
	const t = useTranslations('chat');

	const suggestedActions = [
		t('examplePrompt1'),
		t('examplePrompt2'),
		t('examplePrompt3'),
		t('examplePrompt4'),
	];

	return (
		<div className="grid w-full gap-2 sm:grid-cols-2" data-testid="suggested-actions">
			{suggestedActions.map((suggestedAction, index) => (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 20 }}
					initial={{ opacity: 0, y: 20 }}
					key={suggestedAction}
					transition={{ delay: 0.05 * index }}
				>
					<Suggestion
						className="h-auto w-full whitespace-normal p-3 text-left"
						onClick={(suggestion) => {
							sendMessage({
								role: 'user',
								parts: [{ type: 'text', text: suggestion }],
							});
						}}
						suggestion={suggestedAction}
					>
						{suggestedAction}
					</Suggestion>
				</motion.div>
			))}
		</div>
	);
}

export const SuggestedActions = memo(PureSuggestedActions, (prevProps, nextProps) => {
	if (prevProps.sendMessage !== nextProps.sendMessage) {
		return false;
	}

	return true;
});
