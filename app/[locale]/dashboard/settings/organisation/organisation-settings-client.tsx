'use client';

import { useState, useEffect, useMemo } from 'react';
import { CrudForm, type CrudFormField } from '@/components/crud/crud-form';
import type { Organisation } from '@/lib/types';
import { organisationsService } from '@/lib/organisations-service';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MembersTab } from './members-tab';
import { useRouter } from 'next/navigation';
import { useOrganisationId } from '@/lib/hooks/use-organisation-id';
import { SwitchField } from '@/components/ui/switch-field';
import { ColorPickerField } from '@/components/ui/color-picker-field';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, XCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ApiKeyField({
	value,
	onValueChange,
	hint,
	placeholder,
	description,
}: {
	value: string;
	onValueChange: (v: string) => void;
	hint?: string | null;
	placeholder?: string;
	description?: string;
}) {
	const t = useTranslations('settings');
	const isConfigured = !!hint;

	return (
		<div className="space-y-2">
			{isConfigured ? (
				<Badge variant="outline" className="text-success border-success/30 bg-success/5">
					<CheckCircle2 className="h-3 w-3 mr-1" />
					{t('ai.apiKeyConfigured', { hint })}
				</Badge>
			) : (
				<Badge variant="outline" className="text-muted-foreground">
					<XCircle className="h-3 w-3 mr-1" />
					{t('ai.apiKeyNotConfigured')}
				</Badge>
			)}
			<Input
				type="password"
				value={value || ''}
				onChange={(e) => onValueChange(e.target.value)}
				placeholder={isConfigured ? t('ai.apiKeyReplacePlaceholder') : placeholder}
				autoComplete="off"
			/>
			{description && <p className="text-sm text-muted-foreground">{description}</p>}
		</div>
	);
}

function SmtpPasswordField({
	value,
	onValueChange,
	hint,
}: {
	value: string;
	onValueChange: (v: string) => void;
	hint?: string | null;
}) {
	const t = useTranslations('settings');
	const isConfigured = !!hint;

	return (
		<div className="space-y-2">
			{isConfigured ? (
				<Badge variant="outline" className="text-success border-success/30 bg-success/5">
					<CheckCircle2 className="h-3 w-3 mr-1" />
					{t('email.passwordConfigured', { hint })}
				</Badge>
			) : (
				<Badge variant="outline" className="text-muted-foreground">
					<XCircle className="h-3 w-3 mr-1" />
					{t('email.passwordNotConfigured')}
				</Badge>
			)}
			<Input
				type="password"
				value={value}
				onChange={(e) => onValueChange(e.target.value)}
				placeholder={isConfigured ? t('ai.apiKeyReplacePlaceholder') : ''}
				autoComplete="new-password"
			/>
		</div>
	);
}

interface OrganisationSettingsClientProps {
	emailEnabled: boolean;
}

export function OrganisationSettingsClient({ emailEnabled }: OrganisationSettingsClientProps) {
	const t = useTranslations('settings');
	const router = useRouter();
	const organisationId = useOrganisationId();
	const [organisation, setOrganisation] = useState<Organisation | null>(null);
	const [currentUserId, setCurrentUserId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [emailFormData, setEmailFormData] = useState<Partial<Organisation> & { smtp_pass?: string }>(
		{}
	);

	useEffect(() => {
		if (organisation) {
			setEmailFormData({
				...organisation,
				smtp_pass: '',
			});
		}
	}, [organisation]);

	useEffect(() => {
		const loadData = async () => {
			if (!organisationId) return;

			try {
				const supabase = createClient();
				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) {
					router.push('/auth/login');
					return;
				}
				setCurrentUserId(user.id);

				const org = await organisationsService.getOrganisation(organisationId);
				if (!org) {
					toast.error(t('organisationNotFound'));
					return;
				}
				setOrganisation(org);
			} catch (e: unknown) {
				const errorMessage = e instanceof Error ? e.message : t('updateFailed');
				toast.error(errorMessage);
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [organisationId, router]);

	const fields: CrudFormField[] = [
		{
			name: 'name',
			label: t('organisationName'),
			type: 'text',
			required: true,
			placeholder: t('organisationName'),
		},
		{ name: 'logo', label: t('logo'), type: 'file' },
		{
			name: 'street_and_number',
			label: t('streetAndNumber'),
			type: 'text',
			required: true,
			placeholder: t('streetAndNumber'),
		},
		{ name: 'city', label: t('city'), type: 'text', required: true, placeholder: t('city') },
		{
			name: 'postal_code',
			label: t('postalCode'),
			type: 'text',
			required: true,
			placeholder: t('postalCode'),
		},
		{
			name: 'country',
			label: t('country'),
			type: 'text',
			required: true,
			placeholder: t('country'),
		},
		{
			name: 'footer',
			label: t('footer'),
			type: 'textarea',
			required: true,
			placeholder: t('footer'),
		},
	];

	const proposalFields: CrudFormField[] = [
		{
			name: 'proposal_number_template',
			label: t('proposalNumberTemplate'),
			type: 'text',
			required: false,
			placeholder: t('proposalNumberTemplatePlaceholder'),
			description: t('proposalNumberTemplateDescription'),
		},
		{
			name: 'proposal_number_start',
			label: t('proposalNumberStart'),
			type: 'number',
			required: true,
			placeholder: t('proposalNumberStartPlaceholder'),
			description: t('proposalNumberStartDescription'),
		},
		{
			name: 'color',
			label: t('color'),
			type: 'custom',
			required: false,
			component: ColorPickerField,
			description: t('colorDescription'),
		},
	];

	const aiFields: CrudFormField[] = [
		{
			name: 'ai_feature',
			label: t('ai.featureEnabled'),
			type: 'custom',
			required: false,
			component: SwitchField,
			componentProps: { isSwitch: true },
		},
		{
			name: 'ai_api_key',
			label: t('ai.apiKey'),
			type: 'custom',
			required: false,
			component: ApiKeyField,
			componentProps: {
				hint: organisation?.ai_api_key_hint,
				placeholder: t('ai.apiKeyPlaceholder'),
				description: t('ai.apiKeyDescription'),
			},
		},
		{
			name: 'ai_system_prompt',
			label: t('ai.systemPrompt'),
			type: 'textarea',
			required: false,
			placeholder: t('ai.systemPromptPlaceholder'),
			description: t('ai.systemPromptDescription'),
		},
	];

	const emailFields: CrudFormField[] = [
		{
			name: 'smtp_enabled',
			label: t('email.enabled'),
			type: 'custom',
			required: false,
			component: SwitchField,
			componentProps: { isSwitch: true },
		},
		{
			name: 'smtp_host',
			label: t('email.host'),
			type: 'text',
			required: false,
			placeholder: 'smtp.example.com',
		},
		{
			name: 'smtp_port',
			label: t('email.port'),
			type: 'number',
			required: false,
			placeholder: '587',
		},
		{
			name: 'smtp_user',
			label: t('email.user'),
			type: 'text',
			required: false,
			placeholder: 'user@example.com',
		},
		{
			name: 'smtp_pass',
			label: t('email.password'),
			type: 'custom',
			required: false,
			component: SmtpPasswordField,
			componentProps: { hint: organisation?.smtp_pass_hint },
		},
		{
			name: 'smtp_from',
			label: t('email.from'),
			type: 'text',
			required: false,
			placeholder: 'noreply@example.com',
		},
		{
			name: 'smtp_secure',
			label: t('email.secure'),
			type: 'custom',
			required: false,
			component: SwitchField,
			componentProps: { isSwitch: true },
		},
	];

	const handleEmailSubmit = async (data: Partial<Organisation>) => {
		if (!organisation) return;

		setIsSaving(true);
		try {
			const payload: Record<string, unknown> = {
				smtp_enabled: data.smtp_enabled ?? false,
				smtp_host: data.smtp_host?.trim() || null,
				smtp_port:
					typeof data.smtp_port === 'number'
						? data.smtp_port
						: data.smtp_port != null && data.smtp_port !== ''
							? Number(data.smtp_port)
							: null,
				smtp_user: data.smtp_user?.trim() || null,
				smtp_from: data.smtp_from?.trim() || null,
				smtp_secure: data.smtp_secure ?? false,
			};
			const pass = data.smtp_pass;
			if (typeof pass === 'string' && pass.trim()) {
				payload.smtp_pass = pass.trim();
			}

			const res = await fetch('/api/organisations', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || 'Failed to save email settings');
			}

			const result = await res.json();
			setOrganisation((prev) => (prev ? { ...prev, ...result } : prev));
			setEmailFormData((prev) => ({ ...prev, ...result, smtp_pass: '' }));
			toast.success(t('email.saveSuccess'));
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : t('updateFailed'));
		} finally {
			setIsSaving(false);
		}
	};

	const handleTestEmail = async () => {
		setIsTesting(true);
		try {
			const payload: Record<string, unknown> = {
				smtp_host: emailFormData.smtp_host?.trim() || undefined,
				smtp_port:
					typeof emailFormData.smtp_port === 'number'
						? emailFormData.smtp_port
						: emailFormData.smtp_port != null && emailFormData.smtp_port !== ''
							? Number(emailFormData.smtp_port)
							: undefined,
				smtp_user: emailFormData.smtp_user?.trim() || undefined,
				smtp_from: emailFormData.smtp_from?.trim() || undefined,
				smtp_secure: emailFormData.smtp_secure ?? undefined,
			};
			if (typeof emailFormData.smtp_pass === 'string' && emailFormData.smtp_pass.trim()) {
				payload.smtp_pass = emailFormData.smtp_pass.trim();
			}

			const res = await fetch('/api/email/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || t('email.testError'));
			}

			toast.success(t('email.testSuccess'));
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : t('email.testError'));
		} finally {
			setIsTesting(false);
		}
	};

	const handleEmailFieldChange = (name: string, value: unknown) => {
		setEmailFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
	};

	const emailInitialData = useMemo(() => {
		if (!organisation) return {};
		return {
			...organisation,
			smtp_enabled: organisation.smtp_enabled ?? false,
			smtp_host: organisation.smtp_host ?? '',
			smtp_port: organisation.smtp_port ?? undefined,
			smtp_user: organisation.smtp_user ?? '',
			smtp_from: organisation.smtp_from ?? '',
			smtp_secure: organisation.smtp_secure ?? false,
			smtp_pass: '',
		};
	}, [
		organisation?.id,
		organisation?.smtp_enabled,
		organisation?.smtp_host,
		organisation?.smtp_port,
		organisation?.smtp_user,
		organisation?.smtp_from,
		organisation?.smtp_secure,
	]);

	const handleSubmit = async (data: Partial<Organisation>) => {
		if (!organisation) return;

		setIsSaving(true);
		try {
			const supabase = createClient();
			let logoPath: string | null = organisation.logo ?? null;
			const logoFile = (data as Record<string, unknown>).logo as File | string | undefined;
			if (logoFile === null) {
				// Logo was removed - set to null
				logoPath = null;
			} else if (logoFile && logoFile instanceof File) {
				const fileExt = logoFile.name.split('.').pop();
				const filePath = `organisations/${organisation.id}/logo-${Date.now()}.${fileExt}`;
				const { error: uploadError } = await supabase.storage
					.from('Media')
					.upload(filePath, logoFile, { upsert: true });
				if (uploadError) {
					throw uploadError;
				}
				// Store just the file path, not the full URL
				logoPath = filePath;
			}

			// Check if any AI-sensitive fields are being updated
			const hasAiKeyChange = data.ai_api_key !== undefined && data.ai_api_key !== '';
			const hasAiFieldChanges =
				hasAiKeyChange || data.ai_feature !== undefined || data.ai_system_prompt !== undefined;

			// Route AI fields through the server API for encryption
			if (hasAiFieldChanges) {
				const aiPayload: Record<string, any> = {};
				if (typeof data.ai_feature === 'boolean') aiPayload.ai_feature = data.ai_feature;
				if (data.ai_api_key !== undefined) {
					aiPayload.ai_api_key = data.ai_api_key && data.ai_api_key.trim() ? data.ai_api_key : null;
				}
				if (data.ai_system_prompt !== undefined) {
					aiPayload.ai_system_prompt =
						data.ai_system_prompt && data.ai_system_prompt.trim() ? data.ai_system_prompt : null;
				}

				const res = await fetch('/api/organisations', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(aiPayload),
				});

				if (!res.ok) {
					const errData = await res.json().catch(() => ({}));
					throw new Error(errData.error || t('updateFailed'));
				}

				const serverResult = await res.json();
				// Update local state with server response
				setOrganisation((prev) =>
					prev
						? {
								...prev,
								ai_feature: serverResult.ai_feature ?? prev.ai_feature,
								ai_api_key_hint: serverResult.ai_api_key_hint ?? prev.ai_api_key_hint,
								ai_system_prompt: serverResult.ai_system_prompt ?? prev.ai_system_prompt,
							}
						: prev
				);
			}

			// Update non-sensitive fields via the browser client (logo may be null to clear)
			const nonSensitiveUpdates: Omit<Partial<Organisation>, 'logo'> & {
				logo?: string | null;
			} = {
				name: data.name || organisation.name,
				logo: logoPath,
				street_and_number: data.street_and_number || undefined,
				city: data.city || undefined,
				postal_code: data.postal_code || undefined,
				country: data.country || undefined,
				footer: data.footer || organisation.footer,
				proposal_number_template:
					data.proposal_number_template && data.proposal_number_template.trim()
						? data.proposal_number_template
						: null,
				proposal_number_start:
					typeof data.proposal_number_start === 'number'
						? data.proposal_number_start
						: organisation.proposal_number_start,
				color:
					data.color !== undefined
						? data.color && data.color.trim()
							? data.color
							: null
						: organisation.color,
			};

			// Also include ai_feature and ai_system_prompt for the client update (non-sensitive)
			if (typeof data.ai_feature === 'boolean') {
				nonSensitiveUpdates.ai_feature = data.ai_feature;
			}
			if (data.ai_system_prompt !== undefined) {
				nonSensitiveUpdates.ai_system_prompt =
					data.ai_system_prompt && data.ai_system_prompt.trim() ? data.ai_system_prompt : null;
			}

			const updatedOrg = await organisationsService.updateOrganisation(
				organisation.id,
				nonSensitiveUpdates as Partial<Organisation>
			);
			setOrganisation((prev) => ({
				...updatedOrg,
				ai_api_key_hint: prev?.ai_api_key_hint ?? updatedOrg.ai_api_key_hint,
			}));
			toast.success(t('organisationUpdated'));
		} catch (e: unknown) {
			const errorMessage = e instanceof Error ? e.message : t('updateFailed');
			toast.error(errorMessage);
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto p-6">
				<div className="mb-6">
					<h1 className="text-3xl font-bold tracking-tight">{t('organisationSettings')}</h1>
					<p className="text-muted-foreground">{t('organisationSettingsDescription')}</p>
				</div>
				<div className="text-center py-8">
					<p className="text-muted-foreground">Loading organisation data...</p>
				</div>
			</div>
		);
	}

	if (!organisation || !currentUserId) {
		return (
			<div className="container mx-auto p-6">
				<div className="mb-6">
					<h1 className="text-3xl font-bold tracking-tight">{t('organisationSettings')}</h1>
					<p className="text-muted-foreground">{t('organisationSettingsDescription')}</p>
				</div>
				<div className="text-center py-8">
					<p className="text-muted-foreground">Organisation not found</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{t('organisationSettings')}</h1>
					<p className="text-muted-foreground">{t('organisationSettingsDescription')}</p>
				</div>
			</div>

			<Tabs defaultValue="general" className="w-full">
				<TabsList>
					<TabsTrigger value="general">{t('general')}</TabsTrigger>
					<TabsTrigger value="proposals">{t('proposals')}</TabsTrigger>
					<TabsTrigger value="ai">{t('ai.tab')}</TabsTrigger>
					<TabsTrigger value="email">{t('email.tab')}</TabsTrigger>
					<TabsTrigger value="members">{t('members.tab')}</TabsTrigger>
				</TabsList>

				<TabsContent value="general" className="mt-6">
					<CrudForm<Organisation>
						title={t('generalSettings')}
						fields={fields}
						initialData={organisation}
						onSubmit={handleSubmit}
						isLoading={false}
						isSaving={isSaving}
						showBackButton={false}
						noPadding={true}
					/>
				</TabsContent>

				<TabsContent value="proposals" className="mt-6">
					<CrudForm<Organisation>
						title={t('proposals')}
						fields={proposalFields}
						initialData={{
							...organisation,
							proposal_number_template:
								(organisation as Organisation & { proposal_number_template?: string })
									.proposal_number_template || '',
							proposal_number_start: organisation.proposal_number_start || 0,
							color: organisation.color || null,
						}}
						onSubmit={handleSubmit}
						isLoading={false}
						isSaving={isSaving}
						showBackButton={false}
						noPadding={true}
					/>
				</TabsContent>

				<TabsContent value="ai" className="mt-6">
					{organisation.ai_feature && !organisation.ai_api_key_hint && (
						<Alert variant="destructive" className="mb-6">
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>{t('ai.missingApiKeyWarning')}</AlertDescription>
						</Alert>
					)}
					<CrudForm<Organisation>
						title={t('ai.title')}
						fields={aiFields}
						initialData={{
							...organisation,
							ai_feature: organisation.ai_feature || false,
							ai_api_key: '',
							ai_system_prompt: organisation.ai_system_prompt || '',
						}}
						onSubmit={handleSubmit}
						isLoading={false}
						isSaving={isSaving}
						showBackButton={false}
						noPadding={true}
					/>
				</TabsContent>

				<TabsContent value="email" className="mt-6">
					<CrudForm<Organisation>
						title=""
						fields={emailFields}
						initialData={emailInitialData}
						onSubmit={handleEmailSubmit}
						onFieldChange={handleEmailFieldChange}
						headerActions={
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleTestEmail}
								disabled={isTesting}
							>
								<Send className="h-4 w-4 mr-2" />
								{isTesting ? '...' : t('email.testButton')}
							</Button>
						}
						isLoading={false}
						isSaving={isSaving}
						showBackButton={false}
						noPadding={true}
					/>
				</TabsContent>

				<TabsContent value="members" className="mt-6">
					<MembersTab
						organisationId={organisation.id}
						currentUserId={currentUserId}
						emailEnabled={emailEnabled}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
