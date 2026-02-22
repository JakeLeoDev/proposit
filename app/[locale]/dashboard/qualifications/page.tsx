import AuthWrapper from '../auth-wrapper';
import { QualificationsClient } from './qualifications-client';

export default function QualificationsPage() {
	return (
		<AuthWrapper>
			<QualificationsClient />
		</AuthWrapper>
	);
}
