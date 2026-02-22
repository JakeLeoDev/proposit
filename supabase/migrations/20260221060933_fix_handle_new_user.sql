-- Fix handle_new_user trigger function:
-- 1. Add SET search_path = public for security and reliability
-- 2. Copy first_name, last_name, display_name from raw_user_meta_data
--    so the profile is fully populated in one atomic step at signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, first_name, last_name, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'display_name'
  );
  RETURN NEW;
END;
$$;
