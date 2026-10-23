BEGIN;
-- Direct client requests can edit display information, never their own authority.
CREATE OR REPLACE FUNCTION public.varelia_guard_profile_authority()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF auth.uid() IS NULL OR NEW.id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'No puedes modificar otra cuenta' USING ERRCODE='42501';
    END IF;
    IF TG_OP='UPDATE' THEN
      IF NEW.id IS DISTINCT FROM OLD.id OR NEW.role IS DISTINCT FROM OLD.role
         OR NEW.permissions IS DISTINCT FROM OLD.permissions THEN
        RAISE EXCEPTION 'Los roles y permisos solo se administran desde el servicio de vendedores' USING ERRCODE='42501';
      END IF;
      IF NEW.business_id IS DISTINCT FROM OLD.business_id AND
         (OLD.role<>'owner' OR NOT EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=NEW.business_id AND b.owner_id=auth.uid())) THEN
        RAISE EXCEPTION 'No puedes vincular tu cuenta a un negocio ajeno' USING ERRCODE='42501';
      END IF;
    ELSIF NEW.role<>'owner' OR NOT EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=NEW.business_id AND b.owner_id=auth.uid()) THEN
      RAISE EXCEPTION 'El perfil debe pertenecer a tu propio negocio' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS varelia_guard_profile_authority ON public.profiles;
CREATE TRIGGER varelia_guard_profile_authority BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.varelia_guard_profile_authority();

CREATE OR REPLACE FUNCTION public.varelia_guard_business_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP='UPDATE' AND (NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at
       OR NEW.plan_updated_at IS DISTINCT FROM OLD.plan_updated_at
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.id IS DISTINCT FROM OLD.id) THEN
      RAISE EXCEPTION 'El plan y la propiedad solo se modifican desde el servicio autorizado' USING ERRCODE='42501';
    ELSIF TG_OP='INSERT' AND (NEW.plan<>'basic' OR NEW.plan_expires_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Un negocio nuevo empieza con el plan básico' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS varelia_guard_business_plan ON public.businesses;
CREATE TRIGGER varelia_guard_business_plan BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.varelia_guard_business_plan();

ALTER POLICY profile_insert_own ON public.profiles WITH CHECK
  (id=(SELECT auth.uid()) AND role='owner' AND EXISTS(SELECT 1 FROM public.businesses b WHERE b.id=business_id AND b.owner_id=(SELECT auth.uid())));
ALTER POLICY varelia_suppliers_insert ON public.varelia_suppliers WITH CHECK(business_id=public.varelia_business_id() AND public.varelia_is_owner());
ALTER POLICY varelia_suppliers_update ON public.varelia_suppliers USING(business_id=public.varelia_business_id() AND public.varelia_is_owner()) WITH CHECK(business_id=public.varelia_business_id() AND public.varelia_is_owner());
ALTER POLICY varelia_suppliers_delete ON public.varelia_suppliers USING(business_id=public.varelia_business_id() AND public.varelia_is_owner());
ALTER POLICY varelia_purchases_insert ON public.varelia_purchases WITH CHECK(business_id=public.varelia_business_id() AND public.varelia_is_owner() AND created_by=(SELECT auth.uid()));
ALTER POLICY varelia_purchase_items_insert ON public.varelia_purchase_items WITH CHECK(business_id=public.varelia_business_id() AND public.varelia_is_owner() AND EXISTS(SELECT 1 FROM public.varelia_purchases p WHERE p.id=purchase_id AND p.business_id=varelia_purchase_items.business_id));
ALTER POLICY varelia_cash_closures_insert ON public.varelia_cash_closures WITH CHECK(business_id=public.varelia_business_id() AND created_by=(SELECT auth.uid()));
ALTER POLICY varelia_cash_closures_select ON public.varelia_cash_closures USING(business_id=public.varelia_business_id() AND (public.varelia_is_owner() OR created_by=(SELECT auth.uid())));

ALTER FUNCTION public.varelia_set_updated_at() SET search_path=public,pg_temp;
REVOKE EXECUTE ON FUNCTION public.varelia_catalog_branding_before_save(),public.varelia_settings_branding_after_save(),public.varelia_pay_customer_credit(text,uuid,numeric,text) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.varelia_guard_profile_authority(),public.varelia_guard_business_plan() FROM PUBLIC,anon;
COMMIT;
