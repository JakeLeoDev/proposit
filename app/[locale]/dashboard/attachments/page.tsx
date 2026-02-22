import AuthWrapper from '../auth-wrapper';
import { AttachmentsClient } from './attachments-client';

export default function AttachmentsPage() {
	return (
		<AuthWrapper>
			<AttachmentsClient />
		</AuthWrapper>
	);
}
