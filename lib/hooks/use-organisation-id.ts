'use client';

import { useEffect, useState } from 'react';

export function useOrganisationId(): string | null {
	const [organisationId, setOrganisationId] = useState<string | null>(null);

	useEffect(() => {
		const authWrapper = document.querySelector('[data-organisation-id]');
		if (authWrapper) {
			const id = authWrapper.getAttribute('data-organisation-id');
			setOrganisationId(id);
		}
	}, []);

	return organisationId;
}
