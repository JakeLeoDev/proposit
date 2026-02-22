import type { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';
import { AnimatePresence } from 'framer-motion';
import { ArrowDownIcon } from 'lucide-react';
import { memo, useEffect, useLayoutEffect } from 'react';
import { useMessages } from '@/hooks/use-messages';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import { Conversation, ConversationContent } from './elements/conversation';
import { Greeting } from './greeting';
import { PreviewMessage, ThinkingMessage } from './message';

type MessagesProps = {
	status: UseChatHelpers<ChatMessage>['status'];
	messages: ChatMessage[];
	setMessages: UseChatHelpers<ChatMessage>['setMessages'];
	regenerate: UseChatHelpers<ChatMessage>['regenerate'];
	isReadonly: boolean;
};

function PureMessages({ status, messages, setMessages, regenerate, isReadonly }: MessagesProps) {
	const {
		containerRef: messagesContainerRef,
		endRef: messagesEndRef,
		isAtBottom,
		scrollToBottom,
		hasSentMessage,
	} = useMessages({
		status,
	});

	useDataStream();

	useEffect(() => {
		if (status === 'submitted') {
			requestAnimationFrame(() => {
				const container = messagesContainerRef.current;
				if (container) {
					container.scrollTo({
						top: container.scrollHeight,
						behavior: 'smooth',
					});
				}
			});
		}
	}, [status, messagesContainerRef]);

	// Auto-scroll during streaming if user is at bottom
	// Use useLayoutEffect for synchronous execution before browser paint
	// This ensures smooth scrolling as content streams in
	useLayoutEffect(() => {
		if (status === 'streaming' && isAtBottom) {
			const container = messagesContainerRef.current;
			if (container) {
				// Scroll immediately without animation for smooth streaming
				container.scrollTop = container.scrollHeight;
			}
		}
	}, [status, messages, isAtBottom, messagesContainerRef]);

	return (
		<div className="relative h-full">
			<div
				className="overscroll-behavior-contain -webkit-overflow-scrolling-touch h-full touch-pan-y overflow-y-scroll"
				ref={messagesContainerRef}
				style={{ overflowAnchor: 'none' }}
			>
				<Conversation className="mx-auto flex min-w-0 w-full max-w-4xl flex-col gap-4 md:gap-6 overflow-hidden">
					<ConversationContent className="flex flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
						{messages.length === 0 && <Greeting />}

						{messages.map((message, index) => (
							<PreviewMessage
								isLoading={status === 'streaming' && messages.length - 1 === index}
								isReadonly={isReadonly}
								key={message.id}
								message={message}
								regenerate={regenerate}
								requiresScrollPadding={hasSentMessage && index === messages.length - 1}
								setMessages={setMessages}
							/>
						))}

						<AnimatePresence mode="wait">
							{status === 'submitted' && <ThinkingMessage key="thinking" />}
						</AnimatePresence>

						<div className="min-h-[24px] min-w-[24px] shrink-0" ref={messagesEndRef} />
					</ConversationContent>
				</Conversation>
			</div>

			{!isAtBottom && (
				<button
					aria-label="Scroll to bottom"
					className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-full border bg-background p-2 shadow-lg transition-colors hover:bg-muted"
					onClick={() => scrollToBottom('smooth')}
					type="button"
				>
					<ArrowDownIcon className="size-4" />
				</button>
			)}
		</div>
	);
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
	if (prevProps.status !== nextProps.status) {
		return false;
	}
	if (prevProps.messages.length !== nextProps.messages.length) {
		return false;
	}
	if (!equal(prevProps.messages, nextProps.messages)) {
		return false;
	}

	return false;
});
