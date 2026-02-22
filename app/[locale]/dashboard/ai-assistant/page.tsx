import { Suspense } from 'react';
import { getUserOrganisation } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AIAssistantClient } from './ai-assistant-client';

export default async function AIAssistantPage() {
	const membership = await getUserOrganisation();

	if (!membership) {
		redirect('/auth/login');
	}

	// Check if AI features are enabled for this organization
	if (!membership.organisations.ai_feature) {
		redirect('/dashboard');
	}

	return (
		<Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
			<AIAssistantClient />
		</Suspense>
	);
}
