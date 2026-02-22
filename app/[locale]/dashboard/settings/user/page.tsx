import AuthWrapper from '../../auth-wrapper';
import SettingsClient from './settings-client';

export default function UserSettingsPage() {
	return (
		<AuthWrapper>
			<SettingsClient />
		</AuthWrapper>
	);
}
