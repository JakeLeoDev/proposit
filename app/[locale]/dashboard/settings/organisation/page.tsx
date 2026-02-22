import AuthWrapper from '../../auth-wrapper';
import { OrganisationSettingsClient } from './organisation-settings-client';
import { isEmailConfigured } from '@/lib/email-service';

export default function OrganisationSettingsPage() {
	return (
		<AuthWrapper>
			<OrganisationSettingsClient emailEnabled={isEmailConfigured()} />
		</AuthWrapper>
	);
}
