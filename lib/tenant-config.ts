export const TENANT_MODE = process.env.NEXT_PUBLIC_TENANT_MODE ?? 'single';

export function isSingleTenant(): boolean {
	return TENANT_MODE === 'single';
}

export function isMultiTenant(): boolean {
	return TENANT_MODE === 'multi';
}

export function isMultiInviteTenant(): boolean {
	return TENANT_MODE === 'multi-invite';
}

/**
 * Returns the contact email address configured via CONTACT_EMAIL env variable.
 * Used in registration-blocked messages so users know who to reach out to.
 * Server-side only (not a NEXT_PUBLIC_ variable).
 */
export function getContactEmail(): string | undefined {
	return process.env.CONTACT_EMAIL || undefined;
}
