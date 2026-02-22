'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface OrganisationFormData {
	name: string;
	street_and_number: string;
	city: string;
	postal_code: string;
	country: string;
	logo: string;
}

export async function createOrganisationAction(
	userId: string,
	formData: OrganisationFormData,
	locale: string,
	shouldRedirect: boolean = true
): Promise<{ success: boolean; error?: string; organisationId?: string }> {
	try {
		// Use service role client to bypass RLS for organisation creation
		const supabaseService = createServiceClient();

		// Create organisation using service role (bypasses RLS)
		const { data: organisation, error: orgError } = await supabaseService
			.from('organisations')
			.insert({
				name: formData.name,
				street_and_number: formData.street_and_number,
				city: formData.city,
				postal_code: formData.postal_code,
				country: formData.country,
				logo: formData.logo || '', // Use empty string if no logo provided
			})
			.select()
			.single();

		if (orgError) {
			console.error('Error creating organisation:', orgError.message);
			return { success: false, error: orgError.message };
		}

		// Create organisation membership with admin role using service role (bypasses RLS)
		const { error: membershipError } = await supabaseService.from('organisation_users').insert({
			organisation_id: organisation.id,
			user_id: userId,
			role: 'admin',
		});

		if (membershipError) {
			console.error('Error creating organisation membership:', membershipError.message);
			// Try to clean up the organisation if membership creation fails
			await supabaseService.from('organisations').delete().eq('id', organisation.id);
			return { success: false, error: membershipError.message };
		}

		// Redirect to dashboard on success if shouldRedirect is true
		if (shouldRedirect) {
			redirect(`/${locale}/dashboard`);
		}

		return { success: true, organisationId: organisation.id };
	} catch (error) {
		console.error('Failed to create organisation:', error);
		return { success: false, error: 'An unexpected error occurred' };
	}
}

export async function updateOrganisationLogo(
	organisationId: string,
	logoPath: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const supabase = await createClient();

		const { error } = await supabase
			.from('organisations')
			.update({ logo: logoPath })
			.eq('id', organisationId);

		if (error) {
			console.error('Error updating organisation logo:', error.message);
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (error) {
		console.error('Failed to update organisation logo:', error);
		return { success: false, error: 'An unexpected error occurred' };
	}
}
