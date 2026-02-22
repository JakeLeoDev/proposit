'use client';

import { useEffect, useState } from 'react';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import type { User } from '@/lib/types';
import { usersService } from '@/lib/users-service';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApiTokensTab from './api-tokens-tab';

export default function SettingsClient() {
	const t = useTranslations('auth');
	const tSettings = useTranslations('settings');
	const tCommon = useTranslations('common');
	const tTokens = useTranslations('settings.apiTokens');
	const organisationId = useOrganisationId();
	const [profile, setProfile] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		const load = async () => {
			try {
				const user = await usersService.getAuthUser();
				if (!user) return;
				const p = await usersService.getUserProfile(user.id);
				setProfile(p);
			} catch (e: unknown) {
				const errorMessage = e instanceof Error ? e.message : 'Failed to load profile';
				toast.error(errorMessage);
			} finally {
				setIsLoading(false);
			}
		};
		load();
	}, []);

	const fields: CrudFormField[] = [
		{
			name: 'first_name',
			label: t('firstName'),
			type: 'text',
			required: false,
			placeholder: t('firstName'),
		},
		{
			name: 'last_name',
			label: t('lastName'),
			type: 'text',
			required: false,
			placeholder: t('lastName'),
		},
		{
			name: 'display_name',
			label: t('displayName'),
			type: 'text',
			required: false,
			placeholder: t('displayName'),
		},
		{ name: 'avatar_url', label: tSettings('avatarUrl'), type: 'file', required: false },
	];

	const handleSubmit = async (data: Partial<User>) => {
		setIsSaving(true);
		try {
			const user = await usersService.getAuthUser();
			if (!user) throw new Error('Not authenticated');

			const supabase = createClient();
			let avatarPath = profile?.avatar_url;

			// Handle avatar file upload
			const avatarFile = (data as Record<string, unknown>).avatar_url as File | string | undefined;
			if (avatarFile === null) {
				// Avatar was removed - set to null
				avatarPath = null;
			} else if (avatarFile && avatarFile instanceof File) {
				if (!organisationId) {
					toast.error(tCommon('organisationIdNotAvailable'));
					return;
				}
				const fileExt = avatarFile.name.split('.').pop();
				const filePath = `organisations/${organisationId}/users/${user.id}/avatar-${Date.now()}.${fileExt}`;
				const { error: uploadError } = await supabase.storage
					.from('Media')
					.upload(filePath, avatarFile, { upsert: true });
				if (uploadError) {
					toast.error(tSettings('avatarUploadFailed', { error: uploadError.message }));
					return;
				}
				avatarPath = filePath;
			}

			const updated = await usersService.upsertUserProfile({
				id: user.id,
				first_name: data.first_name ?? null,
				last_name: data.last_name ?? null,
				display_name: data.display_name ?? null,
				avatar_url: avatarPath,
			});
			setProfile(updated);
			toast.success(tSettings('profileSaved'));
		} catch (e: unknown) {
			const errorMessage = e instanceof Error ? e.message : 'Failed to save profile';
			toast.error(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="container mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-3xl font-bold tracking-tight">{tSettings('userSettings')}</h1>
				<p className="text-muted-foreground">{tSettings('userSettingsDescription')}</p>
			</div>

			<Tabs defaultValue="profile" className="w-full">
				<TabsList>
					<TabsTrigger value="profile">{tSettings('userSettings')}</TabsTrigger>
					<TabsTrigger value="api-tokens">{tTokens('tab')}</TabsTrigger>
				</TabsList>

				<TabsContent value="profile" className="mt-6">
					<CrudForm<User>
						title={tSettings('userSettings')}
						fields={fields}
						initialData={
							profile ||
							({
								first_name: '',
								last_name: '',
								display_name: '',
								avatar_url: '',
							} as Partial<User>)
						}
						onSubmit={handleSubmit}
						isLoading={isLoading}
						isSaving={isSaving}
						showBackButton={false}
						noPadding={true}
					/>
				</TabsContent>

				<TabsContent value="api-tokens" className="mt-6">
					<ApiTokensTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
