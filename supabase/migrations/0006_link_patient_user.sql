-- Vincula automaticamente patients.user_id ao auth.users via email.
-- Resolve o bug onde o paciente logava via convite mas patients.user_id ficava NULL,
-- fazendo /portal e /questionnaire mostrarem "Paciente não vinculado".

-- 1) Trigger: quando um auth.users é criado OU tem email confirmado,
--    atualiza patients.user_id onde email bate (case-insensitive) e user_id IS NULL.
CREATE OR REPLACE FUNCTION public.link_patient_to_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.patients
       SET user_id = NEW.id
     WHERE user_id IS NULL
       AND lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_patient ON auth.users;
CREATE TRIGGER on_auth_user_created_link_patient
AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_patient_to_auth_user();

-- 2) Backfill: liga todos os pacientes existentes que já têm auth user mas não estavam linkados.
UPDATE public.patients p
   SET user_id = u.id
  FROM auth.users u
 WHERE p.user_id IS NULL
   AND p.email IS NOT NULL
   AND lower(p.email) = lower(u.email);
