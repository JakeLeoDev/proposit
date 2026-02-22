import AuthWrapper from '../auth-wrapper';
import { CategoriesClient } from './categories-client';

export default function CategoriesPage() {
	return (
		<AuthWrapper>
			<CategoriesClient />
		</AuthWrapper>
	);
}
