import AuthWrapper from '../../auth-wrapper';
import { EditAttachmentClient } from './edit-attachment-client';

interface EditAttachmentPageProps {
	params: {
		id: string;
	};
}

export default async function EditAttachmentPage({ params }: EditAttachmentPageProps) {
	const { id } = await params;

	return (
		<AuthWrapper>
			<EditAttachmentClient attachmentId={id} organisationId="" />
		</AuthWrapper>
	);
}
