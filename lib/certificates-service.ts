import { createClient } from '@/lib/supabase/client';
import type { Certificate } from '@/lib/types';
import { mapServiceError } from '@/lib/error-utils';

export class CertificatesService {
	private supabase = createClient();

	// Get all certificates for an organization
	async getCertificates(organisationId: string): Promise<Certificate[]> {
		const { data, error } = await this.supabase
			.from('certificates')
			.select('*')
			.eq('organisation_id', organisationId)
			.order('created_at', { ascending: false });

		if (error) {
			throw mapServiceError(error, 'fetch');
		}

		return data || [];
	}

	// Get a single certificate by ID
	async getCertificate(id: string): Promise<Certificate | null> {
		const { data, error } = await this.supabase
			.from('certificates')
			.select('*')
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null; // Not found
			}
			throw mapServiceError(error, 'fetch');
		}

		return data;
	}

	// Create a new certificate
	async createCertificate(
		certificate: Omit<Certificate, 'id' | 'created_at'>
	): Promise<Certificate> {
		const { data, error } = await this.supabase
			.from('certificates')
			.insert(certificate)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'create');
		}

		return data;
	}

	// Update an existing certificate
	async updateCertificate(
		id: string,
		updates: Partial<Omit<Certificate, 'id' | 'created_at' | 'organisation_id'>>
	): Promise<Certificate> {
		const { data, error } = await this.supabase
			.from('certificates')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw mapServiceError(error, 'update');
		}

		return data;
	}

	// Delete a certificate
	async deleteCertificate(id: string): Promise<void> {
		const { error } = await this.supabase.from('certificates').delete().eq('id', id);

		if (error) {
			throw mapServiceError(error, 'delete');
		}
	}

	// Subscribe to real-time changes for certificates
	subscribeToCertificates(organisationId: string, callback: (payload: any) => void) {
		return this.supabase
			.channel('certificates-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'certificates',
					filter: `organisation_id=eq.${organisationId}`,
				},
				callback
			)
			.subscribe();
	}

	// Subscribe to real-time changes for a specific certificate
	subscribeToCertificate(id: string, callback: (payload: any) => void) {
		return this.supabase
			.channel(`certificate-${id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'certificates',
					filter: `id=eq.${id}`,
				},
				callback
			)
			.subscribe();
	}
}

// Export a singleton instance
export const certificatesService = new CertificatesService();
