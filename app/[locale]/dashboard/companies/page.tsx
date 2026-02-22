import AuthWrapper from '../auth-wrapper';
import { CompaniesClient } from './companies-client';

export default function CompaniesPage() {
	return (
		<AuthWrapper>
			<CompaniesClient />
		</AuthWrapper>
	);
}
