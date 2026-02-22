import AuthWrapper from '../auth-wrapper';
import { SettingsHubClient } from './settings-hub-client';

export default function SettingsHubPage() {
	return (
		<AuthWrapper>
			<SettingsHubClient />
		</AuthWrapper>
	);
}
