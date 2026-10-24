BEGIN;
CREATE TABLE IF NOT EXISTS private.varelia_control_config (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 principal_id uuid NOT NULL REFERENCES auth.users(id),
 approval_enabled boolean NOT NULL DEFAULT false,
 email_ready boolean NOT NULL DEFAULT false,
 CHECK(NOT approval_enabled OR email_ready)
);
INSERT INTO private.varelia_control_config(singleton,principal_id)
SELECT true,id FROM auth.users WHERE lower(email)='mquispe160993@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT(singleton) DO NOTHING;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM private.varelia_control_config) THEN RAISE EXCEPTION 'Confirma primero el correo principal'; END IF; END $$;
CREATE TABLE IF NOT EXISTS private.varelia_account_access (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending','blocked','removed')),
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS private.varelia_control_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid NOT NULL, target_id uuid NOT NULL, action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.varelia_control_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.varelia_account_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.varelia_control_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.varelia_control_config,private.varelia_account_access,private.varelia_control_audit FROM PUBLIC,anon,authenticated;
INSERT INTO private.varelia_account_access(user_id) SELECT id FROM public.profiles ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION private.varelia_control_is_principal(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM private.varelia_control_config c JOIN auth.users u ON u.id=c.principal_id
 WHERE c.principal_id=p_id AND u.email_confirmed_at IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION private.varelia_control_is_principal(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.varelia_access_allowed() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (
 private.varelia_control_is_principal(auth.uid()) OR (
 COALESCE((SELECT a.status='active' FROM private.varelia_account_access a WHERE a.user_id=auth.uid()),true)
 AND NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.businesses b ON b.id=p.business_id
 JOIN private.varelia_account_access a ON a.user_id=b.owner_id
 WHERE p.id=auth.uid() AND a.status<>'active')));
$$;
REVOKE ALL ON FUNCTION public.varelia_access_allowed() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.varelia_access_allowed() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.varelia_access_context() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE principal boolean; state text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sesión requerida' USING ERRCODE='42501'; END IF;
 principal:=private.varelia_control_is_principal(auth.uid());
 SELECT status INTO state FROM private.varelia_account_access WHERE user_id=auth.uid();
 RETURN jsonb_build_object('principal',principal,'status',coalesce(state,'active'),
 'allowed',public.varelia_access_allowed(),'approval_enabled',(SELECT approval_enabled FROM private.varelia_control_config),
 'email_ready',(SELECT email_ready FROM private.varelia_control_config));
END $$;
REVOKE ALL ON FUNCTION public.varelia_access_context() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.varelia_access_context() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.varelia_register_account_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO private.varelia_account_access(user_id,status) VALUES(NEW.id,
 CASE WHEN (SELECT approval_enabled FROM private.varelia_control_config) AND NOT private.varelia_control_is_principal(NEW.id)
 THEN 'pending' ELSE 'active' END) ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.varelia_register_account_access() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS varelia_register_account_access ON public.profiles;
CREATE TRIGGER varelia_register_account_access AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.varelia_register_account_access();

CREATE OR REPLACE FUNCTION public.varelia_control_accounts() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT private.varelia_control_is_principal(auth.uid()) THEN RAISE EXCEPTION 'Solo la cuenta principal puede abrir este panel' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('context',public.varelia_access_context(),'accounts',coalesce((
 SELECT jsonb_agg(jsonb_build_object('id',p.id,'email',u.email,'name',p.full_name,'role',p.role,
 'business_id',p.business_id,'business_name',b.name,'owner_id',b.owner_id,'confirmed',u.email_confirmed_at IS NOT NULL,
 'created_at',p.created_at,'last_sign_in_at',u.last_sign_in_at,'status',coalesce(a.status,'active'),
 'principal',p.id=(SELECT principal_id FROM private.varelia_control_config)) ORDER BY p.created_at DESC)
 FROM public.profiles p JOIN auth.users u ON u.id=p.id LEFT JOIN public.businesses b ON b.id=p.business_id
 LEFT JOIN private.varelia_account_access a ON a.user_id=p.id),'[]'::jsonb),
 'activity',coalesce((SELECT jsonb_agg(to_jsonb(log)) FROM (
 SELECT l.actor_id,l.target_id,l.action,l.created_at FROM private.varelia_control_audit l ORDER BY l.id DESC LIMIT 100) log),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.varelia_control_accounts() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.varelia_control_accounts() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.varelia_control_set_access(p_user_id uuid,p_status text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT private.varelia_control_is_principal(auth.uid()) THEN RAISE EXCEPTION 'Solo la cuenta principal puede cambiar accesos' USING ERRCODE='42501'; END IF;
 IF p_status NOT IN ('active','blocked','removed') THEN RAISE EXCEPTION 'Estado no válido'; END IF;
 IF private.varelia_control_is_principal(p_user_id) THEN RAISE EXCEPTION 'La cuenta principal no se puede bloquear ni eliminar'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta no encontrada'; END IF;
 IF p_status='active' AND EXISTS(SELECT 1 FROM private.varelia_account_access WHERE user_id=p_user_id AND status<>'active') THEN
 RAISE EXCEPTION 'Para reactivar esta cuenta se requiere una nueva aprobación por código. Configura primero el envío de correo.'; END IF;
 IF EXISTS(SELECT 1 FROM private.varelia_account_access WHERE user_id=p_user_id AND status='pending') THEN
 RAISE EXCEPTION 'La aprobación por código aún no está habilitada'; END IF;
 INSERT INTO private.varelia_account_access(user_id,status,updated_by) VALUES(p_user_id,p_status,auth.uid())
 ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,updated_by=excluded.updated_by,updated_at=now();
 INSERT INTO private.varelia_control_audit(actor_id,target_id,action) VALUES(auth.uid(),p_user_id,p_status);
 RETURN jsonb_build_object('ok',true,'status',p_status);
END $$;
REVOKE ALL ON FUNCTION public.varelia_control_set_access(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.varelia_control_set_access(uuid,text) TO authenticated,service_role;

-- Restrictive policies combine with existing tenant policies; no tenant gains visibility.
DO $policies$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity LOOP
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t.tablename AND policyname='varelia_account_access_gate') THEN
 EXECUTE format('CREATE POLICY varelia_account_access_gate ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.varelia_access_allowed())) WITH CHECK ((SELECT public.varelia_access_allowed()))',t.tablename);
 END IF;
 END LOOP;
END $policies$;

-- Privileged business RPCs bypass RLS, so they must enforce the same account state.
DO $guards$ DECLARE f record; definition text; BEGIN
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND l.lanname='plpgsql'
 AND p.prosecdef AND p.prosrc ILIKE '%auth.uid()%' AND p.proname NOT LIKE 'varelia_control_%'
 AND p.proname NOT IN ('varelia_access_context') LOOP
 definition:=pg_get_functiondef(f.oid);
 IF position('VARELIA_ACCOUNT_ACCESS_GUARD' in definition)=0 THEN
 definition:=regexp_replace(definition,'\mbegin\M',E'begin\n -- VARELIA_ACCOUNT_ACCESS_GUARD\n IF NOT public.varelia_access_allowed() THEN RAISE EXCEPTION ''Cuenta sin acceso. Contacta al administrador principal.'' USING ERRCODE=''42501''; END IF;','i');
 EXECUTE definition;
 END IF;
 END LOOP;
END $guards$;
COMMIT;
