import AuthWrapper from '../auth-wrapper';
import { ProductsClient } from './products-client';

export default function ProductsPage() {
	return (
		<AuthWrapper>
			<ProductsClient />
		</AuthWrapper>
	);
}
