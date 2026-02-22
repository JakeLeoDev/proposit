-- =============================================================================
-- Seed data for local development
-- Loaded after migrations when running `supabase db reset`
--
-- Login:  john.doe@example.com / password123
-- =============================================================================

-- Fixed UUIDs for stable references across resets
DO $$
DECLARE
  v_user_id          uuid := '00000000-0000-0000-0000-000000000001';
  v_organisation_id  uuid := '00000000-0000-0000-0000-000000000010';
  v_company_id       uuid := '00000000-0000-0000-0000-000000000020';
  v_company_id_2     uuid := '00000000-0000-0000-0000-000000000021';
  v_company_id_3     uuid := '00000000-0000-0000-0000-000000000022';
  v_person_id        uuid := '00000000-0000-0000-0000-000000000030';
  v_person_id_2      uuid := '00000000-0000-0000-0000-000000000031';
  v_person_id_3      uuid := '00000000-0000-0000-0000-000000000032';
  v_proposal_id      uuid := '00000000-0000-0000-0000-000000000040';
  v_proposal_id_2    uuid := '00000000-0000-0000-0000-000000000041';
  v_proposal_id_3    uuid := '00000000-0000-0000-0000-000000000042';
  v_proposal_id_4    uuid := '00000000-0000-0000-0000-000000000043';
  v_proposal_id_5    uuid := '00000000-0000-0000-0000-000000000044';
  v_proposal_id_6    uuid := '00000000-0000-0000-0000-000000000045';
  v_lexical_content text := '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Dear Sir or Madam,","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Thank you for your interest.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';
BEGIN

  -- Auth user (handle_new_user trigger automatically creates the public.users row
  -- with first_name, last_name, display_name from raw_user_meta_data)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'john.doe@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '{"provider": "email", "providers": ["email"]}',
    '{"first_name": "John", "last_name": "Doe", "display_name": "John Doe"}',
    false,
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;

  -- Organisation (ai_feature true so seed user can use AI assistant)
  INSERT INTO public.organisations (
    id,
    name,
    street_and_number,
    city,
    postal_code,
    country,
    logo,
    ai_feature
  ) VALUES (
    v_organisation_id,
    'Doe Consulting Inc.',
    '123 Main Street',
    'New York',
    '10001',
    'United States',
    '',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Link user to organisation as admin
  INSERT INTO public.organisation_users (organisation_id, user_id, role)
  VALUES (v_organisation_id, v_user_id, 'admin')
  ON CONFLICT DO NOTHING;

  -- Sample company (customer)
  INSERT INTO public.companies (
    id,
    organisation_id,
    name,
    legal_name,
    legal_form,
    industry,
    email,
    street_and_number,
    city,
    postal_code,
    country
  ) VALUES (
    v_company_id,
    v_organisation_id,
    'Sample Corp',
    'Sample Corporation',
    'Inc.',
    'Technology',
    'info@sample.com',
    '456 Oak Avenue',
    'San Francisco',
    '94102',
    'United States'
  ) ON CONFLICT (id) DO NOTHING;

  -- Sample contact person at that company
  INSERT INTO public.persons (
    id,
    organisation_id,
    company_id,
    first_name,
    last_name,
    position,
    email
  ) VALUES (
    v_person_id,
    v_organisation_id,
    v_company_id,
    'Jane',
    'Smith',
    'Head of Procurement',
    'jane.smith@sample.com'
  ) ON CONFLICT (id) DO NOTHING;

  -- Second company
  INSERT INTO public.companies (
    id,
    organisation_id,
    name,
    legal_name,
    legal_form,
    industry,
    email,
    street_and_number,
    city,
    postal_code,
    country
  ) VALUES (
    v_company_id_2,
    v_organisation_id,
    'TechStart LLC',
    'TechStart Limited Liability Company',
    'LLC',
    'Software',
    'contact@techstart.io',
    '789 Innovation Drive',
    'Austin',
    '78701',
    'United States'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.persons (
    id,
    organisation_id,
    company_id,
    first_name,
    last_name,
    position,
    email
  ) VALUES (
    v_person_id_2,
    v_organisation_id,
    v_company_id_2,
    'Tom',
    'Wilson',
    'CTO',
    'tom.wilson@techstart.io'
  ) ON CONFLICT (id) DO NOTHING;

  -- Third company
  INSERT INTO public.companies (
    id,
    organisation_id,
    name,
    legal_name,
    legal_form,
    industry,
    email,
    street_and_number,
    city,
    postal_code,
    country
  ) VALUES (
    v_company_id_3,
    v_organisation_id,
    'Green Energy Co.',
    'Green Energy Company',
    'Inc.',
    'Energy',
    'office@greenenergy.com',
    '100 Solar Way',
    'Denver',
    '80202',
    'United States'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.persons (
    id,
    organisation_id,
    company_id,
    first_name,
    last_name,
    position,
    email
  ) VALUES (
    v_person_id_3,
    v_organisation_id,
    v_company_id_3,
    'Sarah',
    'Brown',
    'Project Manager',
    'sarah.brown@greenenergy.com'
  ) ON CONFLICT (id) DO NOTHING;

  -- Proposal 1: Draft (existing)
  INSERT INTO public.proposals (
    id,
    name,
    internal_name,
    content,
    expiry_date,
    status,
    proposal_number,
    organisation_id,
    company,
    recipient,
    preparator
  ) VALUES (
    v_proposal_id,
    'Software Development 2026',
    'INT-2026-001',
    '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Dear Sir or Madam,","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Thank you for your interest. We are pleased to submit our proposal for software development.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'::json,
    (CURRENT_DATE + INTERVAL '30 days')::date,
    'Draft',
    'AN-2026-001',
    v_organisation_id,
    v_company_id,
    v_person_id,
    v_user_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Proposal 2: Draft (different customer)
  INSERT INTO public.proposals (
    id,
    name,
    internal_name,
    content,
    expiry_date,
    status,
    proposal_number,
    organisation_id,
    company,
    recipient,
    preparator
  ) VALUES (
    v_proposal_id_2,
    'IT Strategy Consulting Q2 2026',
    'INT-2026-002',
    v_lexical_content::json,
    (CURRENT_DATE + INTERVAL '60 days')::date,
    'Draft',
    NULL,
    v_organisation_id,
    v_company_id_2,
    v_person_id_2,
    v_user_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Proposal 3: Sent
  INSERT INTO public.proposals (
    id,
    name,
    internal_name,
    content,
    expiry_date,
    status,
    proposal_number,
    organisation_id,
    company,
    recipient,
    preparator
  ) VALUES (
    v_proposal_id_3,
    'Hosting and Maintenance 2026',
    'INT-2025-042',
    v_lexical_content::json,
    (CURRENT_DATE + INTERVAL '14 days')::date,
    'Sent',
    'AN-2025-042',
    v_organisation_id,
    v_company_id,
    v_person_id,
    v_user_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Proposal 4: Read
  INSERT INTO public.proposals (
    id,
    name,
    internal_name,
    content,
    expiry_date,
    status,
    proposal_number,
    organisation_id,
    company,
    recipient,
    preparator
  ) VALUES (
    v_proposal_id_4,
    'Lexical Editor Training',
    'INT-2025-038',
    v_lexical_content::json,
    (CURRENT_DATE + INTERVAL '7 days')::date,
    'Read',
    'AN-2025-038',
    v_organisation_id,
    v_company_id_2,
    v_person_id_2,
    v_user_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Proposal 5: Accepted
  INSERT INTO public.proposals (
    id,
    name,
    internal_name,
    content,
    expiry_date,
    status,
    proposal_number,
    organisation_id,
    company,
    recipient,
    preparator
  ) VALUES (
    v_proposal_id_5,
    'Annual Maintenance Contract 2026',
    'INT-2025-035',
    v_lexical_content::json,
    (CURRENT_DATE + INTERVAL '90 days')::date,
    'Accepted',
    'AN-2025-035',
    v_organisation_id,
    v_company_id,
    v_person_id,
    v_user_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Proposal 6: Rejected (expired)
  INSERT INTO public.proposals (
    id,
    name,
    internal_name,
    content,
    expiry_date,
    status,
    proposal_number,
    organisation_id,
    company,
    recipient,
    preparator
  ) VALUES (
    v_proposal_id_6,
    'Dashboard Redesign Pilot Project',
    'INT-2025-028',
    v_lexical_content::json,
    (CURRENT_DATE - INTERVAL '10 days')::date,
    'Rejected',
    'AN-2025-028',
    v_organisation_id,
    v_company_id_3,
    v_person_id_3,
    v_user_id
  ) ON CONFLICT (id) DO NOTHING;

END $$;
