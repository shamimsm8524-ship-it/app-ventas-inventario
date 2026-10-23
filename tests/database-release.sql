BEGIN;
CREATE TEMP TABLE qa_context(owner_a uuid,owner_b uuid,cashier uuid,biz_a uuid,biz_b uuid,product_a uuid,product_b uuid);
INSERT INTO qa_context(owner_a,owner_b,cashier,product_a,product_b) VALUES(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
-- Users exist only inside this rollback transaction; no email is sent.
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at)
SELECT u,u::text||'@example.invalid','{"full_name":"QA fixture"}',now(),now()
FROM qa_context q CROSS JOIN LATERAL unnest(ARRAY[q.owner_a,q.owner_b,q.cashier]) u;
UPDATE qa_context q SET biz_a=(SELECT business_id FROM public.profiles WHERE id=q.owner_a),biz_b=(SELECT business_id FROM public.profiles WHERE id=q.owner_b);
UPDATE public.profiles SET business_id=(SELECT biz_a FROM qa_context),role='cashier',permissions='{"sales":true,"cash":true,"inventory":false}' WHERE id=(SELECT cashier FROM qa_context);
INSERT INTO public.varelia_products(id,business_id,legacy_id,name,unit,buy_price,sell_price,stock,sale_presentations)
SELECT product_a,biz_a,product_a::text,'QA A','Unidad',3.333333,15,100,'[{"id":"dozen","name":"Docena","units":12,"price":150,"buyCost":45,"active":true}]' FROM qa_context;
INSERT INTO public.varelia_products(id,business_id,legacy_id,name,unit,buy_price,sell_price,stock)
SELECT product_b,biz_b,product_b::text,'QA B','Unidad',7,10,50 FROM qa_context;
CREATE TEMP TABLE qa_results(label text);
CREATE FUNCTION pg_temp.qa_assert(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'QA FAIL: %',label; END IF;
  INSERT INTO qa_results VALUES(label);
END $$;
CREATE FUNCTION pg_temp.qa_denied(statement text,label text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE denied boolean:=false; BEGIN
  BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  PERFORM pg_temp.qa_assert(denied,label);
END $$;
GRANT SELECT ON qa_context TO authenticated,anon;
GRANT ALL ON qa_results TO authenticated,anon;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT owner_a::text FROM qa_context),true);
SELECT pg_temp.qa_assert((SELECT count(*) FROM public.varelia_products)=1,'owner sees only own business');
SELECT pg_temp.qa_denied(format('UPDATE public.profiles SET business_id=%L WHERE id=%L',(SELECT biz_b FROM qa_context),(SELECT owner_a FROM qa_context)),'owner cannot join another business');
SELECT pg_temp.qa_denied('UPDATE public.businesses SET plan=''premium'' WHERE id=(SELECT biz_a FROM qa_context)','owner cannot self-upgrade plan');
UPDATE public.profiles SET full_name='Updated name' WHERE id=(SELECT owner_a FROM qa_context);
SELECT pg_temp.qa_assert((SELECT full_name='Updated name' FROM public.profiles WHERE id=auth.uid()),'display name remains editable');
SELECT public.varelia_staff_stock_in((SELECT product_a FROM qa_context),0.5,'restock');
SELECT pg_temp.qa_assert((SELECT stock=100.5 FROM public.varelia_products WHERE id=(SELECT product_a FROM qa_context)),'fractional stock is preserved');
DO $$
DECLARE payload jsonb; first_sale jsonb; replay jsonb; denied boolean:=false; before_stock numeric;
BEGIN
 SELECT jsonb_build_array(jsonb_build_object('product_id',product_a,'qty',1,'unit_price',15,'request_id',gen_random_uuid())) INTO payload FROM qa_context;
 SELECT stock INTO before_stock FROM public.varelia_products WHERE id=(SELECT product_a FROM qa_context);
 first_sale:=public.varelia_commit_sale(payload,'Venta');
 replay:=public.varelia_commit_sale(payload,'Venta');
 PERFORM pg_temp.qa_assert(first_sale=replay,'retry returns the original receipt');
 PERFORM pg_temp.qa_assert((SELECT stock=before_stock-1 FROM public.varelia_products WHERE id=(SELECT product_a FROM qa_context)),'retry decrements stock only once');
 BEGIN PERFORM public.varelia_commit_sale(jsonb_set(payload,'{0,qty}','2'),'Venta'); EXCEPTION WHEN raise_exception THEN denied:=true; END;
 PERFORM pg_temp.qa_assert(denied,'changed request cannot reuse the same payment ID');
 payload:=jsonb_set(payload,'{0,request_id}',to_jsonb(gen_random_uuid()::text));
 first_sale:=public.varelia_commit_credit_sale(payload,'Cliente QA');
 replay:=public.varelia_commit_credit_sale(payload,'Cliente QA');
 PERFORM pg_temp.qa_assert(first_sale->>'sale_id'=replay->>'sale_id','credit retry creates one debt');
 PERFORM pg_temp.qa_assert((SELECT count(*)=1 FROM public.varelia_credit_sales WHERE sale_id=(first_sale->>'sale_id')::uuid),'credit has one record');
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT cashier::text FROM qa_context),true);
SELECT pg_temp.qa_denied('UPDATE public.profiles SET role=''owner'' WHERE id=auth.uid()','cashier cannot become owner');
SELECT pg_temp.qa_denied('UPDATE public.profiles SET permissions=''{}''::jsonb WHERE id=auth.uid()','cashier cannot change own permissions');
SELECT pg_temp.qa_assert((SELECT count(*) FROM public.varelia_products)=1,'cashier sees assigned business inventory');
SELECT pg_temp.qa_denied('INSERT INTO public.varelia_products(business_id,name) SELECT biz_a,''forbidden'' FROM qa_context','cashier cannot create products');
SELECT pg_temp.qa_denied('INSERT INTO public.varelia_suppliers(business_id,name) SELECT biz_a,''forbidden'' FROM qa_context','cashier cannot create suppliers');
SELECT pg_temp.qa_denied('INSERT INTO public.varelia_cash_closures(business_id,total,created_by) SELECT biz_a,1,owner_a FROM qa_context','cashier cannot forge another user cash closure');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.qa_assert((SELECT count(*) FROM public.varelia_products)=0,'anonymous cannot read inventory');
SELECT pg_temp.qa_assert((SELECT count(*) FROM public.profiles)=0,'anonymous cannot read accounts');
RESET ROLE;
ROLLBACK;
SELECT 'PASS: 18 account, tenant, role, fractional stock, idempotent checkout and credit assertions; fixtures rolled back' AS result;
