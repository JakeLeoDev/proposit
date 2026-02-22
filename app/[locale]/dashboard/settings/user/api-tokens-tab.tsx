'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiTokensService } from '@/lib/api-tokens-service';
import { usersService } from '@/lib/users-service';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';
import type { ApiToken } from '@/lib/types';

type TokenListItem = Pick<ApiToken, 'id' | 'name' | 'token_prefix' | 'last_used_at' | 'created_at'>;

export default function ApiTokensTab() {
	const t = useTranslations('settings.apiTokens');
	const tCommon = useTranslations('common');
	const organisationId = useOrganisationId();
	const [tokens, setTokens] = useState<TokenListItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [userId, setUserId] = useState<string | null>(null);

	// Create dialog state
	const [createOpen, setCreateOpen] = useState(false);
	const [tokenName, setTokenName] = useState('');
	const [isCreating, setIsCreating] = useState(false);

	// Created token display
	const [createdToken, setCreatedToken] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				const user = await usersService.getAuthUser();
				if (!user) return;
				setUserId(user.id);
				const data = await apiTokensService.getTokens(user.id);
				setTokens(data);
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : tCommon('errorOccurred');
				toast.error(msg);
			} finally {
				setIsLoading(false);
			}
		};
		load();
	}, []);

	const handleCreate = async () => {
		if (!userId || !organisationId || !tokenName.trim()) return;
		setIsCreating(true);
		try {
			const { token } = await apiTokensService.createToken(userId, organisationId, tokenName.trim());
			setCreatedToken(token);
			// Refresh list
			const data = await apiTokensService.getTokens(userId);
			setTokens(data);
			setTokenName('');
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : tCommon('errorOccurred');
			toast.error(msg);
		} finally {
			setIsCreating(false);
		}
	};

	const handleRevoke = async (tokenId: string) => {
		try {
			await apiTokensService.deleteToken(tokenId);
			setTokens((prev) => prev.filter((t) => t.id !== tokenId));
			toast.success(t('tokenRevoked'));
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : tCommon('errorOccurred');
			toast.error(msg);
		}
	};

	const handleCopy = async (text: string) => {
		await navigator.clipboard.writeText(text);
		toast.success(t('tokenCopied'));
	};

	const mcpUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '';

	const claudeDesktopConfig = mcpUrl
		? JSON.stringify(
				{
					mcpServers: {
						proposit: {
							type: 'streamable-http',
							url: mcpUrl,
							headers: {
								Authorization: 'Bearer pt_your_token_here',
							},
						},
					},
				},
				null,
				2
			)
		: '';

	const claudeCodeCommand = mcpUrl
		? `claude mcp add --transport http proposit "${mcpUrl}" --header "Authorization: Bearer pt_your_token_here"`
		: '';

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	return (
		<div className="space-y-6">
			{/* MCP Setup */}
			{mcpUrl && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle>{t('mcpSetup')}</CardTitle>
						<CardDescription>{t('mcpSetupDescription')}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Server URL */}
						<div className="space-y-1.5">
							<p className="text-sm font-medium">{t('mcpUrl')}</p>
							<div className="flex items-center gap-2">
								<code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono">{mcpUrl}</code>
								<Button variant="outline" size="icon" onClick={() => handleCopy(mcpUrl)}>
									<Copy className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* Claude Desktop */}
						<div className="space-y-1.5">
							<p className="text-sm font-medium">{t('mcpClaudeDesktop')}</p>
							<p className="text-xs text-muted-foreground">{t('mcpClaudeDesktopDescription')}</p>
							<div className="flex items-start gap-2">
								<code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono whitespace-pre">
									{claudeDesktopConfig}
								</code>
								<Button
									variant="outline"
									size="icon"
									className="shrink-0"
									onClick={() => handleCopy(claudeDesktopConfig)}
								>
									<Copy className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* Claude Code */}
						<div className="space-y-1.5">
							<p className="text-sm font-medium">{t('mcpClaudeCode')}</p>
							<p className="text-xs text-muted-foreground">{t('mcpClaudeCodeDescription')}</p>
							<div className="flex items-center gap-2">
								<code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
									{claudeCodeCommand}
								</code>
								<Button
									variant="outline"
									size="icon"
									className="shrink-0"
									onClick={() => handleCopy(claudeCodeCommand)}
								>
									<Copy className="h-4 w-4" />
								</Button>
							</div>
						</div>

						{/* Token note */}
						<p className="text-xs text-muted-foreground">{t('mcpTokenNote')}</p>
					</CardContent>
				</Card>
			)}

			{/* Create Token Dialog */}
			<div className="flex justify-end">
				<Dialog
					open={createOpen}
					onOpenChange={(open) => {
						setCreateOpen(open);
						if (!open) {
							setCreatedToken(null);
							setTokenName('');
						}
					}}
				>
					<DialogTrigger asChild>
						<Button>
							<Plus className="mr-2 h-4 w-4" />
							{t('createToken')}
						</Button>
					</DialogTrigger>
					<DialogContent>
						{createdToken ? (
							<>
								<DialogHeader>
									<DialogTitle>{t('tokenCreated')}</DialogTitle>
									<DialogDescription>{t('tokenCreatedWarning')}</DialogDescription>
								</DialogHeader>
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">
											{createdToken}
										</code>
										<Button variant="outline" size="icon" onClick={() => handleCopy(createdToken)}>
											<Copy className="h-4 w-4" />
										</Button>
									</div>
								</div>
								<DialogFooter>
									<Button
										onClick={() => {
											setCreateOpen(false);
											setCreatedToken(null);
										}}
									>
										OK
									</Button>
								</DialogFooter>
							</>
						) : (
							<>
								<DialogHeader>
									<DialogTitle>{t('createToken')}</DialogTitle>
								</DialogHeader>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="token-name">{t('tokenName')}</Label>
										<Input
											id="token-name"
											value={tokenName}
											onChange={(e) => setTokenName(e.target.value)}
											placeholder={t('tokenNamePlaceholder')}
											onKeyDown={(e) => {
												if (e.key === 'Enter' && tokenName.trim()) {
													handleCreate();
												}
											}}
										/>
									</div>
								</div>
								<DialogFooter>
									<Button variant="outline" onClick={() => setCreateOpen(false)}>
										{t('cancel')}
									</Button>
									<Button onClick={handleCreate} disabled={!tokenName.trim() || isCreating}>
										{t('create')}
									</Button>
								</DialogFooter>
							</>
						)}
					</DialogContent>
				</Dialog>
			</div>

			{/* Token List */}
			{isLoading ? (
				<p className="text-muted-foreground text-center py-8">Loading...</p>
			) : tokens.length === 0 ? (
				<p className="text-muted-foreground text-center py-8">{t('noTokens')}</p>
			) : (
				<div className="space-y-3">
					{tokens.map((token) => (
						<Card key={token.id}>
							<CardContent className="flex items-center justify-between py-4">
								<div className="space-y-1">
									<p className="font-medium">{token.name}</p>
									<p className="text-sm text-muted-foreground font-mono">{token.token_prefix}</p>
									<p className="text-xs text-muted-foreground">
										{t('lastUsed')}: {token.last_used_at ? formatDate(token.last_used_at) : t('never')}
										{' | '}
										{t('createdAt')}: {formatDate(token.created_at)}
									</p>
								</div>
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button variant="ghost" size="icon" className="text-destructive">
											<Trash2 className="h-4 w-4" />
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>{t('revokeTitle')}</AlertDialogTitle>
											<AlertDialogDescription>{t('revokeDescription')}</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
											<AlertDialogAction onClick={() => handleRevoke(token.id)}>
												{t('revoke')}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
