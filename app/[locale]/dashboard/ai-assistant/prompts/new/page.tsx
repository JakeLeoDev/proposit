import AuthWrapper from '../../../auth-wrapper';
import { NewPromptTemplateClient } from './new-prompt-template-client';

export default function NewPromptTemplatePage() {
	return (
		<AuthWrapper>
			<NewPromptTemplateClient />
		</AuthWrapper>
	);
}
