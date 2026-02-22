import AuthWrapper from '../auth-wrapper';
import { CertificatesClient } from './certificates-client';

export default function CertificatesPage() {
	return (
		<AuthWrapper>
			<CertificatesClient />
		</AuthWrapper>
	);
}
