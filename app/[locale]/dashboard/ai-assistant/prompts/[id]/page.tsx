import AuthWrapper from '../../../auth-wrapper';
import { EditPromptTemplateClient } from './edit-prompt-template-client';

interface EditPromptTemplatePageProps {
	params: Promise<{
		id: string;
	}>;
}

export default async function EditPromptTemplatePage({ params }: EditPromptTemplatePageProps) {
	const { id } = await params;

	return (
		<AuthWrapper>
			<EditPromptTemplateClient templateId={id} />
		</AuthWrapper>
	);
}
