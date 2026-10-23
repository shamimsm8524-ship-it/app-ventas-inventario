BEGIN;
CREATE OR REPLACE FUNCTION public.varelia_record_cash_closure(p_id uuid,p_total numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u uuid:=auth.uid(); b uuid; r text; perms jsonb; c public.varelia_cash_closures%rowtype;
BEGIN
 SELECT business_id,role,permissions INTO b,r,perms FROM public.profiles WHERE id=u;
 IF b IS NULL OR (r<>'owner' AND coalesce((perms->>'cash')::boolean,false) IS NOT TRUE) THEN RAISE EXCEPTION 'No tienes permiso para cerrar caja'; END IF;
 IF p_id IS NULL OR p_total IS NULL OR p_total<0 OR p_total::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Importe de cierre no válido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('cash:'||p_id::text,0));
 SELECT * INTO c FROM public.varelia_cash_closures WHERE id=p_id;
 IF FOUND THEN
   IF c.business_id<>b OR c.created_by IS DISTINCT FROM u THEN RAISE EXCEPTION 'Cierre no disponible'; END IF;
   RETURN to_jsonb(c);
 END IF;
 -- The amount records the current cash-screen snapshot; sales remain the financial source.
 INSERT INTO public.varelia_cash_closures(id,business_id,total,day_key,created_by)
 VALUES(p_id,b,round(p_total,2),to_char(now() AT TIME ZONE 'America/Lima','YYYY-MM-DD'),u) RETURNING * INTO c;
 RETURN to_jsonb(c);
END $$;
REVOKE ALL ON FUNCTION public.varelia_record_cash_closure(uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.varelia_record_cash_closure(uuid,numeric) TO authenticated;
COMMIT;
