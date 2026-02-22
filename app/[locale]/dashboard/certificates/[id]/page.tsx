import AuthWrapper from '../../auth-wrapper';
import { EditCertificateClient } from './edit-certificate-client';

interface EditCertificatePageProps {
	params: {
		id: string;
	};
}

export default async function EditCertificatePage({ params }: EditCertificatePageProps) {
	const { id } = await params;

	return (
		<AuthWrapper>
			<EditCertificateClient certificateId={id} />
		</AuthWrapper>
	);
}
