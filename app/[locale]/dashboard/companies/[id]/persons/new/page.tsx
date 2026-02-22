import AuthWrapper from '../../../../auth-wrapper';
import { NewPersonClient } from './new-person-client';

interface NewPersonPageProps {
	params: {
		id: string; // company id
	};
}

export default async function NewPersonPage({ params }: NewPersonPageProps) {
	const { id } = await params;

	return (
		<AuthWrapper>
			<NewPersonClient companyId={id} />
		</AuthWrapper>
	);
}
