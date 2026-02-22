# Reusable CRUD Components

Reference for `DataTable` and `CrudForm` — the two components used for all entity management pages.

## DataTable

**Location**: `components/crud/data-table.tsx`

Displays a list of entities with search, sortable columns, and row actions (view, edit, delete, preview). Handles loading and error states internally.

### Props

```ts
interface DataTableProps<T> {
	title: string;
	description?: string;
	data: T[];
	columns: DataTableColumn<T>[];
	isLoading?: boolean;
	error?: string | null;
	searchKey?: keyof T; // enables built-in client-side search
	searchPlaceholder?: string;
	onSearch?: (query: string) => void;
	onCreate?: () => void; // shows "Create" button when provided
	onEdit?: (item: T) => void;
	onDelete?: (item: T) => void;
	onView?: (item: T) => void;
	onPreview?: (item: T) => void;
	createButtonText?: string;
	emptyMessage?: string;
	idKey?: keyof T; // defaults to 'id'
	hrefPrefix?: string; // e.g. '/dashboard/companies' — row links to hrefPrefix/id
	className?: string;
}

interface DataTableColumn<T> {
	key: keyof T | string;
	label: string;
	render?: (value: any, item: T) => React.ReactNode;
	sortable?: boolean;
	width?: string;
}
```

### Example

```tsx
const columns: DataTableColumn<Company>[] = [
	{ key: 'name', label: t('name') },
	{ key: 'city', label: t('city') },
	{
		key: 'created_at',
		label: t('created'),
		render: (value) => new Date(value).toLocaleDateString(),
	},
];

<DataTable
	title={t('companies')}
	description={t('manageCompanies')}
	data={companies}
	columns={columns}
	isLoading={isLoading}
	error={error}
	onCreate={() => router.push('/dashboard/companies/new')}
	onDelete={handleDelete}
	hrefPrefix="/dashboard/companies"
	searchKey="name"
	searchPlaceholder={t('search')}
/>;
```

---

## CrudForm

**Location**: `components/crud/crud-form.tsx`

Form for creating and editing entities. Shows a change indicator in the header ("Unsaved changes" / "Saving..." / "Saved") and disables the save button when no changes are detected.

### Field types

| Type           | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| `text`         | Standard text input                                            |
| `password`     | Password input (masked)                                        |
| `number`       | Numeric input                                                  |
| `textarea`     | Multi-line text                                                |
| `richtext`     | Lexical rich text editor                                       |
| `select`       | Dropdown — requires `options: { value, label }[]`              |
| `autocomplete` | Searchable select with create — requires `autocompleteService` |
| `date`         | Date picker                                                    |
| `file`         | File/image upload                                              |
| `custom`       | Any component — pass `component` and `componentProps`          |

### Props

```ts
interface CrudFormField {
	name: string;
	label: string;
	type:
		| 'text'
		| 'password'
		| 'number'
		| 'textarea'
		| 'richtext'
		| 'select'
		| 'autocomplete'
		| 'date'
		| 'file'
		| 'custom';
	required?: boolean;
	placeholder?: string;
	description?: string;
	options?: { value: string; label: string }[]; // for select
	autocompleteService?: AutocompleteServiceConfig<any>; // for autocomplete
	component?: React.ComponentType<any>; // for custom
	componentProps?: Record<string, any>;
	tab?: string; // assign field to a named tab
	dependsOn?: string[]; // re-renders when these field values change
	getValue?: (data: any) => any; // transform initial value for display
}

interface CrudFormProps<T> {
	title: string;
	description?: string;
	fields: CrudFormField[];
	initialData?: Partial<T>;
	onSubmit: (data: Partial<T>) => Promise<void>;
	onDelete?: () => Promise<void>;
	onPreview?: () => void;
	headerActions?: ReactNode; // extra buttons in the header
	onSaveSuccess?: (data: Partial<T>) => void;
	isLoading?: boolean;
	isSaving?: boolean;
	isDeleting?: boolean;
	showBackButton?: boolean;
	backHref?: string;
	tabs?: { value: string; label: string }[]; // group fields into tabs
	noPadding?: boolean;
	// For AI agent context
	entityType?: string;
	entityId?: string;
	organisationId?: string;
	onFieldChange?: (name: string, value: any) => void;
	markDirtyOnInitialDataChange?: boolean;
	className?: string;
}
```

### Example

```tsx
const fields: CrudFormField[] = [
	{
		name: 'name',
		label: t('name'),
		type: 'text',
		required: true,
	},
	{
		name: 'industry',
		label: t('industry'),
		type: 'select',
		options: [
			{ value: 'technology', label: 'Technology' },
			{ value: 'finance', label: 'Finance' },
		],
	},
	{
		name: 'notes',
		label: t('notes'),
		type: 'richtext',
	},
];

<CrudForm
	title={isNew ? t('createCompany') : t('editCompany')}
	fields={fields}
	initialData={company}
	onSubmit={handleSubmit}
	onDelete={company ? handleDelete : undefined}
	backHref="/dashboard/companies"
	isLoading={isLoading}
	isSaving={isSaving}
	organisationId={organisationId}
/>;
```

---

## Adding a New Entity — Checklist

1. Add the TypeScript type to `lib/types.ts`
2. Create a service class in `lib/<entity>-service.ts` (see existing services for the pattern — `getEntities`, `createEntity`, `updateEntity`, `deleteEntity`, `subscribeTo*`)
3. Create a Zustand store in `lib/stores/<entity>.store.ts` using `createEntityStore()`
4. Create the pages:
   - `app/[locale]/dashboard/<entities>/page.tsx` — server component, renders `<EntityClient>`
   - `app/[locale]/dashboard/<entities>/<entity>-client.tsx` — client component with `DataTable`
   - `app/[locale]/dashboard/<entities>/new/page.tsx` — server component, renders `<EntityFormClient>`
   - `app/[locale]/dashboard/<entities>/[id]/page.tsx` — same, with `initialData`
5. Add i18n keys to `messages/en.json` and `messages/de.json`
6. Add the route to the sidebar in `components/dashboard/sidebar.tsx`
7. Add a DB migration if the table is new (`npm run db:migrate <name>`)
