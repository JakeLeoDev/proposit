import AuthWrapper from '../../auth-wrapper';
import { NewCategoryClient } from './new-category-client';

export default function NewCategoryPage() {
	return (
		<AuthWrapper>
			<NewCategoryClient />
		</AuthWrapper>
	);
}
