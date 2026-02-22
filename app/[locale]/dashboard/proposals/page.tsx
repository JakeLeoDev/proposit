import AuthWrapper from '../auth-wrapper';
import { ProposalsClient } from './proposals-client';

export default function ProposalsPage() {
	return (
		<AuthWrapper>
			<ProposalsClient />
		</AuthWrapper>
	);
}
