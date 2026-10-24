BEGIN;
CREATE TEMP TABLE ac_qa(principal uuid,owner_a uuid,owner_b uuid,staff uuid,business_a uuid,business_b uuid,product uuid);
INSERT INTO ac_qa(principal,owner_a,owner_b,staff,product)
SELECT principal_id,gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid() FROM private.varelia_control_config;
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at)
SELECT id,id::text||'@example.invalid','{"full_name":"QA access"}',now(),now() FROM ac_qa
CROSS JOIN LATERAL unnest(ARRAY[owner_a,owner_b,staff]) id;
UPDATE ac_qa SET business_a=(SELECT business_id FROM public.profiles WHERE id=owner_a),business_b=(SELECT business_id FROM public.profiles WHERE id=owner_b);
UPDATE public.profiles SET role='cashier',business_id=(SELECT business_a FROM ac_qa),permissions='{"sales":true}' WHERE id=(SELECT staff FROM ac_qa);
INSERT INTO public.varelia_products(id,business_id,legacy_id,name,unit,stock,sell_price,buy_price)
SELECT product,business_a,product::text,'QA access product','Unidad',10,2,1 FROM ac_qa;
CREATE TEMP TABLE ac_results(label text);
CREATE FUNCTION pg_temp.ac_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; INSERT INTO ac_results VALUES(label); END $$;
CREATE FUNCTION pg_temp.ac_denied(statement text,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN INSERT INTO ac_results VALUES(label); RETURN; END;
 RAISE EXCEPTION 'FAIL: %',label; END $$;
GRANT SELECT ON ac_qa TO authenticated;GRANT ALL ON ac_results TO authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT owner_a::text FROM ac_qa),true);
SELECT pg_temp.ac_assert(NOT (public.varelia_access_context()->>'principal')::boolean,'ordinary owner is not principal');
SELECT pg_temp.ac_denied('SELECT public.varelia_control_accounts()','ordinary owner cannot list global emails');
SELECT pg_temp.ac_denied('SELECT public.varelia_control_set_access((SELECT owner_b FROM ac_qa),''blocked'')','owner cannot block another business');
SELECT pg_temp.ac_assert((SELECT count(*) FROM public.varelia_products WHERE id=(SELECT product FROM ac_qa))=1,'active owner retains tenant access');
SELECT set_config('request.jwt.claim.sub',(SELECT principal::text FROM ac_qa),true);
SELECT pg_temp.ac_assert((public.varelia_access_context()->>'principal')::boolean,'verified primary has control access');
SELECT pg_temp.ac_assert(jsonb_array_length(public.varelia_control_accounts()->'accounts')>=3,'primary sees account hierarchy');
SELECT pg_temp.ac_denied('SELECT public.varelia_control_set_access((SELECT principal FROM ac_qa),''removed'')','primary cannot remove itself');
SELECT public.varelia_control_set_access((SELECT owner_a FROM ac_qa),'blocked');
SELECT set_config('request.jwt.claim.sub',(SELECT owner_a::text FROM ac_qa),true);
SELECT pg_temp.ac_assert(NOT public.varelia_access_allowed(),'blocked owner loses access with existing JWT');
SELECT pg_temp.ac_assert((SELECT count(*) FROM public.varelia_products WHERE id=(SELECT product FROM ac_qa))=0,'RLS blocks data for blocked owner');
SELECT pg_temp.ac_denied('SELECT public.varelia_commit_sale(jsonb_build_array(jsonb_build_object(''product_id'',(SELECT product FROM ac_qa),''qty'',1)))','privileged checkout RPC blocks blocked owner');
SELECT set_config('request.jwt.claim.sub',(SELECT staff::text FROM ac_qa),true);
SELECT pg_temp.ac_assert(NOT public.varelia_access_allowed(),'staff inherits blocked business access');
SELECT pg_temp.ac_denied('SELECT public.varelia_control_accounts()','staff cannot access global panel');
SELECT set_config('request.jwt.claim.sub',(SELECT owner_b::text FROM ac_qa),true);
SELECT pg_temp.ac_assert(public.varelia_access_allowed(),'unrelated business remains active');
SELECT set_config('request.jwt.claim.sub',(SELECT principal::text FROM ac_qa),true);
SELECT public.varelia_control_set_access((SELECT owner_b FROM ac_qa),'removed');
SELECT pg_temp.ac_denied('SELECT public.varelia_control_set_access((SELECT owner_b FROM ac_qa),''active'')','removed account cannot reactivate without new approval code');
SELECT pg_temp.ac_assert(NOT (public.varelia_access_context()->>'approval_enabled')::boolean,'signup approval stays disabled until email is configured');
RESET ROLE;
SELECT 'PASS: '||count(*)||' account-control assertions; all fixtures and access changes rolled back' AS result FROM ac_results;
ROLLBACK;
