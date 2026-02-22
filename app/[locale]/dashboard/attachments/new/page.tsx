import AuthWrapper from '../../auth-wrapper';
import { NewAttachmentClient } from './new-attachment-client';

export default function NewAttachmentPage() {
	return (
		<AuthWrapper>
			<NewAttachmentClient />
		</AuthWrapper>
	);
}
