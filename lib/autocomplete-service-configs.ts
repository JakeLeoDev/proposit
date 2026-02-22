import type { AutocompleteServiceConfig } from './types';
import type { Company, Person, Category } from './types';
import { companiesService } from './companies-service';
import { personsService } from './persons-service';
import { categoriesService } from './categories-service';

export const companyAutocompleteConfig: AutocompleteServiceConfig<Company> = {
	fetchAll: (orgId) => companiesService.getCompanies(orgId),
	fetchById: (id) => companiesService.getCompany(id),
	createMinimal: (name, orgId) => companiesService.createMinimalCompany(name, orgId),
	subscribe: (orgId, cb) => companiesService.subscribeToCompanies(orgId, cb),
	getLabelField: (entity) => entity.name,
	getIdField: (entity) => entity.id,
};

export const personAutocompleteConfig: AutocompleteServiceConfig<Person> = {
	fetchAll: (orgId, dependencies) => {
		// If company dependency is provided, fetch only persons for that company
		const companyId = dependencies?.company || dependencies?.company_id;
		if (companyId) {
			return personsService.getPersonsByCompany(companyId);
		}
		// Otherwise fetch all persons for the organization
		return personsService.getPersons(orgId);
	},
	fetchById: (id) => personsService.getPerson(id),
	createMinimal: (name, orgId, deps) => {
		const [firstName, ...lastNameParts] = name.split(' ');
		const lastName = lastNameParts.join(' ') || firstName;
		return personsService.createMinimalPerson(firstName, lastName, orgId, deps);
	},
	subscribe: (orgId, cb, dependencies) => {
		// If company dependency is provided, subscribe only to persons for that company
		const companyId = dependencies?.company || dependencies?.company_id;
		if (companyId) {
			return personsService.subscribeToPersonsByCompany(companyId, cb);
		}
		// Otherwise subscribe to all persons for the organization
		return personsService.subscribeToPersons(orgId, cb);
	},
	getLabelField: (entity) => `${entity.first_name} ${entity.last_name}`,
	getIdField: (entity) => entity.id,
};

export const categoryAutocompleteConfig: AutocompleteServiceConfig<Category> = {
	fetchAll: (orgId) => categoriesService.getCategories(orgId),
	fetchById: (id) => categoriesService.getCategory(id),
	createMinimal: (name, orgId) => categoriesService.createMinimalCategory(name, orgId),
	subscribe: (orgId, cb) => categoriesService.subscribeToCategories(orgId, cb),
	getLabelField: (entity) => entity.name,
	getIdField: (entity) => entity.id,
};
