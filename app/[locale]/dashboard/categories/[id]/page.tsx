import AuthWrapper from '../../auth-wrapper';
import { EditCategoryClient } from './edit-category-client';

interface EditCategoryPageProps {
	params: {
		id: string;
	};
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
	const { id } = await params;

	return (
		<AuthWrapper>
			<EditCategoryClient categoryId={id} />
		</AuthWrapper>
	);
}
