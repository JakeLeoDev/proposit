'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createOrganisationAction } from './actions';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { Building2, MapPin, ImageIcon, Check } from 'lucide-react';

interface CreateOrganisationClientProps {
	userId: string;
	locale: string;
}

export function CreateOrganisationClient({ userId, locale }: CreateOrganisationClientProps) {
	const t = useTranslations('auth');
	const tSettings = useTranslations('settings');
	const tCommon = useTranslations('common');
	const [currentStep, setCurrentStep] = useState(1);
	const [formData, setFormData] = useState({
		name: '',
		street_and_number: '',
		city: '',
		postal_code: '',
		country: '',
	});
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const supabase = createClient();

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setLogoFile(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setLogoPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleNext = () => {
		setError(null);

		if (currentStep === 1) {
			if (!formData.name.trim()) {
				setError(t('organisationName') + ' is required');
				return;
			}
		}

		if (currentStep === 2) {
			if (
				!formData.street_and_number.trim() ||
				!formData.city.trim() ||
				!formData.postal_code.trim() ||
				!formData.country.trim()
			) {
				setError(t('allAddressFieldsRequired'));
				return;
			}
		}

		setCurrentStep((prev) => prev + 1);
	};

	const handleBack = () => {
		setError(null);
		setCurrentStep((prev) => prev - 1);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (currentStep < 3) {
				handleNext();
			}
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Prevent submission if not on the final step
		if (currentStep !== 3) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			// First, create the organisation without redirect
			const result = await createOrganisationAction(
				userId,
				{
					...formData,
					logo: '', // Will be updated after logo upload
				},
				locale,
				false // Don't redirect yet
			);

			if (!result.success || !result.organisationId) {
				setError(result.error || 'An unexpected error occurred');
				toast.error(t('organisationCreationFailed'));
				return;
			}

			// Upload logo if provided, using the organisation ID
			if (logoFile) {
				const fileExt = logoFile.name.split('.').pop();
				const filePath = `organisations/${result.organisationId}/logo.${fileExt}`;
				const { error: uploadError } = await supabase.storage
					.from('Media')
					.upload(filePath, logoFile, { upsert: true });

				if (uploadError) {
					console.error('Error uploading logo:', uploadError);
					// Don't fail the whole process if logo upload fails
					toast.error(tSettings('logoUploadFailed'));
				} else {
					// Update organisation with logo path
					const { updateOrganisationLogo } = await import('./actions');
					const logoResult = await updateOrganisationLogo(result.organisationId, filePath);

					if (!logoResult.success) {
						console.error('Error updating logo path:', logoResult.error);
					}
				}
			}

			toast.success(t('organisationCreated'));

			// Manually redirect to dashboard
			window.location.href = `/${locale}/dashboard`;
		} catch (err: any) {
			console.error('Error creating organisation:', err);
			setError(err?.message || 'An unexpected error occurred');
			toast.error(t('organisationCreationFailed'));
		} finally {
			setIsLoading(false);
		}
	};

	const steps = [
		{
			number: 1,
			title: t('organisationName'),
			icon: Building2,
		},
		{
			number: 2,
			title: tSettings('address'),
			icon: MapPin,
		},
		{
			number: 3,
			title: tSettings('logo'),
			icon: ImageIcon,
		},
	];

	return (
		<div className="flex items-center justify-center p-4">
			<Card className="w-full max-w-2xl">
				<CardHeader className="space-y-6">
					{/* Modern Step Indicator */}
					<div className="relative">
						<div className="flex items-center justify-between">
							{steps.map((step, index) => {
								const isCompleted = currentStep > step.number;
								const isCurrent = currentStep === step.number;
								const Icon = step.icon;

								return (
									<div key={step.number} className="flex flex-col items-center flex-1">
										{/* Step Circle */}
										<div className="relative flex items-center justify-center w-full">
											{/* Connection Line Before */}
											{index > 0 && (
												<div
													className={`absolute right-1/2 top-1/2 -translate-y-1/2 h-0.5 w-full transition-all duration-300 ${
														isCompleted || isCurrent ? 'bg-primary' : 'bg-muted'
													}`}
												/>
											)}

											{/* Circle */}
											<div
												className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
													isCompleted
														? 'border-primary bg-primary text-primary-foreground'
														: isCurrent
															? 'border-primary bg-background text-primary scale-110 shadow-md'
															: 'border-muted bg-muted/50 text-muted-foreground'
												}`}
											>
												{isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
											</div>

											{/* Connection Line After */}
											{index < steps.length - 1 && (
												<div
													className={`absolute left-1/2 top-1/2 -translate-y-1/2 h-0.5 w-full transition-all duration-300 ${
														isCompleted ? 'bg-primary' : 'bg-muted'
													}`}
												/>
											)}
										</div>

										{/* Step Label */}
										<div
											className={`mt-3 text-center text-sm font-medium transition-colors duration-300 ${
												isCurrent ? 'text-foreground' : 'text-muted-foreground'
											}`}
										>
											{step.title}
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* Title and Description */}
					<div className="text-center space-y-2">
						<CardTitle className="text-3xl">{t('createOrganisationTitle')}</CardTitle>
						<CardDescription className="text-base">{t('createOrganisationDescription')}</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						{/* Step 1: Organization Name */}
						{currentStep === 1 && (
							<div className="space-y-6">
								<div className="space-y-2">
									<Label htmlFor="name">{t('organisationName')}</Label>
									<Input
										id="name"
										type="text"
										value={formData.name}
										onChange={(e) => handleChange('name', e.target.value)}
										onKeyDown={handleKeyDown}
										placeholder={t('organisationName')}
										disabled={isLoading}
										required
									/>
									<p className="text-sm text-muted-foreground">
										{t('organisationNameHint', {
											defaultValue: 'This will be displayed on your proposals and documents',
										})}
									</p>
								</div>

								<Button type="button" onClick={handleNext} className="w-full">
									{tCommon('continue', { defaultValue: 'Continue' })}
								</Button>
							</div>
						)}

						{/* Step 2: Address */}
						{currentStep === 2 && (
							<div className="space-y-6">
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="street_and_number">{tSettings('streetAndNumber')}</Label>
										<Input
											id="street_and_number"
											type="text"
											value={formData.street_and_number}
											onChange={(e) => handleChange('street_and_number', e.target.value)}
											onKeyDown={handleKeyDown}
											placeholder={tSettings('streetAndNumber')}
											disabled={isLoading}
											required
										/>
									</div>

									<div className="grid gap-4 md:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="postal_code">{tSettings('postalCode')}</Label>
											<Input
												id="postal_code"
												type="text"
												value={formData.postal_code}
												onChange={(e) => handleChange('postal_code', e.target.value)}
												onKeyDown={handleKeyDown}
												placeholder={tSettings('postalCode')}
												disabled={isLoading}
												required
											/>
										</div>

										<div className="space-y-2">
											<Label htmlFor="city">{tSettings('city')}</Label>
											<Input
												id="city"
												type="text"
												value={formData.city}
												onChange={(e) => handleChange('city', e.target.value)}
												onKeyDown={handleKeyDown}
												placeholder={tSettings('city')}
												disabled={isLoading}
												required
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="country">{tSettings('country')}</Label>
										<Input
											id="country"
											type="text"
											value={formData.country}
											onChange={(e) => handleChange('country', e.target.value)}
											onKeyDown={handleKeyDown}
											placeholder={tSettings('country')}
											disabled={isLoading}
											required
										/>
									</div>
								</div>

								<div className="flex gap-3">
									<Button type="button" onClick={handleBack} variant="outline" className="flex-1">
										{tCommon('back')}
									</Button>
									<Button type="button" onClick={handleNext} className="flex-1">
										{tCommon('continue', { defaultValue: 'Continue' })}
									</Button>
								</div>
							</div>
						)}

						{/* Step 3: Logo Upload */}
						{currentStep === 3 && (
							<div className="space-y-6">
								{logoPreview ? (
									<div className="space-y-4">
										<Label>{tSettings('logoPreview')}</Label>
										<div className="flex flex-col items-center justify-center space-y-4 p-6 border-2 border-dashed rounded-lg bg-muted/10">
											<div className="relative h-40 w-40 overflow-hidden rounded-lg border bg-background shadow-sm">
												<Image src={logoPreview} alt="Logo preview" fill className="object-contain p-4" />
											</div>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => {
													setLogoFile(null);
													setLogoPreview(null);
													const input = document.getElementById('logo') as HTMLInputElement;
													if (input) input.value = '';
												}}
												disabled={isLoading}
											>
												{tCommon('remove', { defaultValue: 'Remove' })}
											</Button>
										</div>
									</div>
								) : (
									<div className="space-y-2">
										<Label htmlFor="logo">{tSettings('logo')} (Optional)</Label>
										<div className="flex flex-col items-center justify-center space-y-3 p-8 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors cursor-pointer bg-muted/10">
											<div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
												<ImageIcon className="h-8 w-8 text-muted-foreground" />
											</div>
											<div className="text-center space-y-1">
												<p className="text-sm font-medium">
													{tCommon('uploadFile', { defaultValue: 'Upload a file' })}
												</p>
												<p className="text-xs text-muted-foreground">PNG, JPG, or SVG up to 10MB</p>
											</div>
											<Input
												id="logo"
												type="file"
												accept="image/*"
												onChange={handleLogoChange}
												disabled={isLoading}
												className="hidden"
											/>
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onClick={() => document.getElementById('logo')?.click()}
												disabled={isLoading}
											>
												{tCommon('selectFile', { defaultValue: 'Select file' })}
											</Button>
										</div>
									</div>
								)}

								<div className="flex gap-3">
									<Button
										type="button"
										onClick={handleBack}
										variant="outline"
										className="flex-1"
										disabled={isLoading}
									>
										{tCommon('back')}
									</Button>
									<Button type="submit" className="flex-1" disabled={isLoading}>
										{isLoading ? tCommon('loading') : t('createOrganisation')}
									</Button>
								</div>
							</div>
						)}
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
