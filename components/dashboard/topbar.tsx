'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Separator } from '@/components/ui/separator';
import { useTranslations } from 'next-intl';
import type { Organisation } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';
import { Settings, Building2, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

interface DashboardTopbarProps {
	organization: Organisation;
}

export function DashboardTopbar({ organization }: DashboardTopbarProps) {
	const router = useRouter();
	const tNav = useTranslations('navigation');
	const tDashboard = useTranslations('dashboard');
	const { theme, toggleTheme, mounted } = useTheme();
	const [displayName, setDisplayName] = useState<string>('');
	const [email, setEmail] = useState<string>('');
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

	useEffect(() => {
		const supabase = createClient();
		const load = async () => {
			const { data } = await supabase.auth.getUser();
			if (data?.user) {
				setEmail(data.user.email || '');
				const userId = data.user.id;
				const { data: profile } = await supabase.from('users').select('*').eq('id', userId).single();
				const fullName =
					profile?.first_name && profile?.last_name
						? `${profile.first_name} ${profile.last_name}`.trim()
						: profile?.display_name || data.user.user_metadata?.name || data.user.email || '';
				setDisplayName(fullName);

				// Handle avatar URL - generate signed URL if needed
				let avatarUrlValue = null;
				if (profile?.avatar_url) {
					// Check if it's already a full URL
					if (profile.avatar_url.startsWith('http://') || profile.avatar_url.startsWith('https://')) {
						avatarUrlValue = profile.avatar_url;
					} else {
						// It's a storage path, generate signed URL
						const { data: signedUrlData } = await supabase.storage
							.from('Media')
							.createSignedUrl(profile.avatar_url, 3600);
						avatarUrlValue = signedUrlData?.signedUrl || null;
					}
				}
				setAvatarUrl(avatarUrlValue);
			}
		};
		load();
	}, []);

	const initials = useMemo(() => {
		const name = displayName || email || '';
		const parts = name.trim().split(/\s+/);
		const first = parts[0]?.[0] || '';
		const second = parts.length > 1 ? parts[1][0] : email ? email[0] : '';
		return (first + (second || '')).toUpperCase();
	}, [displayName, email]);

	const handleLogout = async () => {
		const supabase = createClient();
		await supabase.auth.signOut();
		router.push('/');
		router.refresh();
	};

	return (
		<header className="border-b bg-background">
			<div className="flex items-center justify-between px-6 py-4">
				<div className="flex items-center space-x-4">
					<Link href="/dashboard" className="flex items-center gap-0">
						<Logo width={32} height={32} className="h-7 w-auto object-contain" alt="Proposit" />
						<h1 className="text-xl font-bold">roposit</h1>
					</Link>
					<Separator orientation="vertical" className="h-6" />
					<div className="flex items-center gap-2">
						{organization.logo && (
							<AuthenticatedImage
								src={`Media/${organization.logo}`}
								alt={`${organization.name} Logo`}
								width={24}
								height={24}
								className="h-6 w-auto object-contain"
							/>
						)}
						<span className="text-sm text-muted-foreground">{organization.name}</span>
					</div>
				</div>

				<div className="flex items-center space-x-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleTheme}
						className="h-9 w-9"
						aria-label={tDashboard('toggleTheme')}
					>
						{mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger className="flex items-center gap-3 outline-none cursor-pointer">
							<div className="flex items-center gap-2">
								<Avatar className="h-8 w-8">
									{avatarUrl && <AvatarImage src={avatarUrl} alt={displayName || email} />}
									<AvatarFallback>{initials || 'U'}</AvatarFallback>
								</Avatar>
								<span className="text-sm font-medium max-w-[180px] truncate">{displayName || email}</span>
							</div>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-60 p-1">
							{/* <DropdownMenuLabel className="font-semibold px-3 py-2">{displayName || email}</DropdownMenuLabel>
                            <DropdownMenuSeparator /> */}
							<Link href="/dashboard/settings/user">
								<DropdownMenuItem className="cursor-pointer px-3 py-2.5">
									<Settings className="mr-2.5 h-4 w-4" />
									{tNav('settings')}
								</DropdownMenuItem>
							</Link>
							<Link href="/dashboard/settings/organisation">
								<DropdownMenuItem className="cursor-pointer px-3 py-2.5">
									<Building2 className="mr-2.5 h-4 w-4" />
									{tNav('organisation')}
								</DropdownMenuItem>
							</Link>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="cursor-pointer text-error-dark focus:text-error-dark focus:bg-error-light px-3 py-2.5"
								onSelect={(e) => {
									e.preventDefault();
									handleLogout();
								}}
							>
								<LogOut className="mr-2.5 h-4 w-4" />
								{tNav('logout')}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
