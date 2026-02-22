import { Suspense } from 'react';
import { AcceptInvitationClient } from './accept-invitation-client';

export default function AcceptInvitationPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<AcceptInvitationClient />
		</Suspense>
	);
}
