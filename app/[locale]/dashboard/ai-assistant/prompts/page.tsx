import AuthWrapper from '../../auth-wrapper';
import { PromptTemplatesClient } from './prompt-templates-client';

export default function PromptTemplatesPage() {
	return (
		<AuthWrapper>
			<PromptTemplatesClient />
		</AuthWrapper>
	);
}
