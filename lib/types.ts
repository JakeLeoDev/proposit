// Database types that match Supabase schema exactly
export interface User {
	id: string;
	display_name: string | null;
	avatar_url: string | null;
	created_at: string;
	last_name: string | null;
	first_name: string | null;
}

export interface Organisation {
	id: string;
	name: string;
	logo: string;
	street_and_number?: string;
	city?: string;
	postal_code?: string;
	country?: string;
	footer: string | null;
	proposal_number_template?: string | null;
	proposal_number_start: number;
	ai_feature: boolean;
	ai_api_key?: string | null;
	ai_api_key_hint?: string | null;
	ai_system_prompt?: string | null;
	color?: string | null;
	created_at: string;
	smtp_enabled?: boolean;
	smtp_host?: string | null;
	smtp_port?: number | null;
	smtp_user?: string | null;
	smtp_pass?: string | null;
	smtp_pass_hint?: string | null;
	smtp_from?: string | null;
	smtp_secure?: boolean;
}

export interface OrganisationUser {
	organisation_id: string;
	user_id: string;
	role: string; // defaults to 'member'
	joined_at: string;
}

export interface OrganisationUserWithOrganisation extends OrganisationUser {
	organisations: Organisation;
}

export interface OrganisationMember extends OrganisationUser {
	users: User;
}

export interface AllowedRegistration {
	id: string;
	email: string;
	note: string | null;
	created_at: string;
}

export interface OrganisationInvitation {
	id: string;
	organisation_id: string;
	email: string;
	invited_by: string;
	token: string;
	expires_at: string;
	accepted_at: string | null;
	created_at: string;
}

// Proposal related types
export interface Proposal {
	id: string;
	name: string;
	internal_name: string | null;
	content: unknown; // JSON content - required
	attachment: string | null; // UUID to attachments
	expiry_date: string; // ISO date (date in DB) - required
	status: string; // Enum in DB (Proposal Status Types)
	proposal_number: string | null;
	organisation_id: string;
	created_at: string;
	company: string; // UUID to companies
	qualification: string | null; // UUID to qualifications
	certificate: string | null; // UUID to certificates
	recipient: string; // UUID to persons
	preparator: string; // UUID to users (required)
	online_signature?: boolean; // Online signature feature (default: false)
}

export interface ProposalVersion {
	id: string;
	proposal_id: string;
	version_number: number;
	name: string;
	internal_name: string | null;
	content: unknown; // JSON content
	attachment: string | null; // UUID to attachments
	expiry_date: string; // ISO date
	status: string; // Enum in DB (Proposal Status Types)
	proposal_number: string | null;
	organisation_id: string;
	company: string; // UUID to companies
	qualification: string | null; // UUID to qualifications
	certificate: string | null; // UUID to certificates
	recipient: string; // UUID to persons
	preparator: string; // UUID to users
	// Note: online_signature is not included as it doesn't exist in the proposals table schema
	created_at: string;
}

export interface ProposalImage {
	id: string;
	proposal_id: string;
	organisation_id: string;
	storage_path: string;
	created_at: string;
}

export interface Link {
	id: string;
	created_at: string;
	proposal_id: string;
	token: string;
	exp_date: string;
	organisation_id: string;
}

export interface Category {
	id: string;
	organisation_id: string;
	name: string;
	description: string | null;
	created_at: string;
}

export interface Company {
	id: string;
	name: string;
	description: string | null;
	legal_name: string;
	legal_form: string;
	industry: string;
	street_and_number?: string;
	city?: string;
	postal_code?: string;
	country?: string;
	email: string | null;
	number: string | null;
	website: string | null;
	fax: string | null;
	tax_number: string | null;
	vat_id: string | null;
	commercial_register: string | null;
	ceo: string | null;
	organisation_id: string;
	created_at: string;
}

export interface Person {
	id: string;
	first_name: string;
	last_name: string;
	title?: string | null;
	position?: string;
	email?: string;
	number?: string;
	mobile_number?: string;
	organisation_id: string;
	company_id: string;
	created_at: string;
}

// Chat attachment type (different from database Attachment)
export interface ChatAttachment {
	name: string;
	url: string;
	contentType?: string;
	filename?: string;
	mediaType?: string;
}

export interface Attachment {
	id: string;
	name: string;
	description: string;
	content: unknown; // JSONB content for rich text
	organisation_id: string;
	created_at: string;
}

export interface Qualification {
	id: string;
	name: string;
	description: string;
	content: unknown; // JSONB content for rich text
	category: string; // UUID reference to categories table
	organisation_id: string;
	created_at: string;
}

export interface Certificate {
	id: string;
	name: string;
	description: string;
	content: unknown; // JSONB content for rich text
	category: string; // UUID reference to categories table
	organisation_id: string;
	created_at: string;
}

// Product templates
export interface ProductCollectionTemplate {
	id: string;
	iternal_name: string | null; // Note: column name spelled as 'iternal_name' in DB, now nullable
	internal_notes: string | null;
	name: string;
	description: string | null; // Text field (changed from JSONB rich text)
	category: string; // UUID reference to categories table
	discount?: string | null; // Optional discount value
	discount_type?: string | null; // Optional discount type (percent, fixed, etc.)
	organisation_id: string;
	created_at: string;
	show_prices?: boolean; // default true in DB; omit when creating
}

export interface ProductItemTemplate {
	id: string;
	collection_id: string;
	iternal_name: string | null; // Note: column name spelled as 'iternal_name' in DB, now nullable
	internal_notes: string | null; // now nullable
	name: string;
	description: string | null; // now nullable
	unit_price: number;
	unit_type: string;
	organisation_id: string;
	position: number;
	created_at: string;
}

// Instance tables
export interface ProductCollection {
	id: string;
	created_at: string;
	proposal_id: string;
	collection_reference: string | null;
	name: string;
	description: string | null; // Text field (changed from JSON)
	discount?: string | null; // Optional discount value
	discount_type?: string | null; // Optional discount type (percent, fixed, etc.)
	organisation_id: string;
	show_prices?: boolean; // default true in DB; omit when creating
}

export interface ProductItem {
	id: string;
	created_at: string;
	product_collection_id: string;
	name: string;
	description: string | null;
	unit_price: number;
	unit_type: string; // text field in DB
	unit_amount: number;
	organisation_id: string;
	position: number;
}

// AI SDK types
import type { UIMessage } from 'ai';

// Use AI SDK UIMessage type directly
export type ChatMessage = UIMessage;

// Legacy types for backward compatibility
export interface ChatMessageContent {
	type: 'text' | 'tool_use';
	text?: string;
	id?: string;
	name?: string;
	input?: unknown;
}

export interface ToolResult {
	name: string;
	result: unknown;
}

export interface ToolError {
	name: string;
	error: string;
	toolId?: string; // Optional tool ID to match with specific tool_use
}

export interface StreamError {
	error: string;
	timestamp?: string;
}

export interface ChatEvent {
	event: 'claude' | 'tool_result' | 'tool_error' | 'error' | 'final' | 'done';
	data:
		| ChatMessage
		| ToolResult
		| ToolError
		| StreamError
		| { reply: string; sessionId: string }
		| string;
}

export interface ChatResponse {
	sessionId: string;
	message: string;
	isNewSession?: boolean;
	sessionTitle?: string;
}

// UI and application types
export type Locale = 'en' | 'de';

// Legacy types (keep for compatibility during migration)
export interface Profile {
	id: string;
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
	created_at: string;
	updated_at: string;
}

export interface Organization {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	logo_url: string | null;
	created_at: string;
	updated_at: string;
}

export interface UserMembership {
	id: string;
	user_id: string;
	organization_id: string;
	role: 'owner' | 'admin' | 'member';
	active: boolean;
	created_at: string;
	updated_at: string;
	organizations?: Organization;
}

// New AI Agent types
export interface EntityContext {
	entityType: string;
	entityId?: string;
	fields: Record<string, any>;
	fieldTypes: Record<string, string>;
	fieldValidation: Record<
		string,
		{ required?: boolean; placeholder?: string; options?: { value: string; label: string }[] }
	>;
	isCreate: boolean;
}

// Legacy chat event types (kept for compatibility during migration)
// Note: ChatEvent is no longer used with AI SDK, but kept for backward compatibility

// Autocomplete service configuration
export interface AutocompleteServiceConfig<T> {
	// Fetch all entities for organisation (with optional filtering by dependencies)
	fetchAll: (organisationId: string, dependencies?: Record<string, string>) => Promise<T[]>;
	// Fetch single entity by ID
	fetchById: (id: string) => Promise<T | null>;
	// Create minimal entity with name
	createMinimal: (
		name: string,
		organisationId: string,
		dependencies?: Record<string, string>
	) => Promise<T>;
	// Subscribe to real-time updates (with optional filtering by dependencies)
	subscribe: (
		organisationId: string,
		callback: (payload: any) => void,
		dependencies?: Record<string, string>
	) => any;
	// Extract display label from entity
	getLabelField: (entity: T) => string;
	// Extract ID from entity
	getIdField: (entity: T) => string;
}

export interface UserPromptTemplate {
	id: string;
	user_id: string;
	name: string;
	text: string;
	created_at: string;
}

export interface ApiToken {
	id: string;
	user_id: string;
	organisation_id: string;
	name: string;
	token_hash: string;
	token_prefix: string;
	last_used_at: string | null;
	created_at: string;
}
