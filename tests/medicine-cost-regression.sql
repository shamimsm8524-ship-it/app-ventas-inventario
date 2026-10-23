BEGIN;
CREATE TEMP TABLE med_qa(u uuid,b uuid,p uuid);
INSERT INTO med_qa(u,p) VALUES(gen_random_uuid(),gen_random_uuid());
INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at)
SELECT u,u::text||'@example.invalid','{"full_name":"QA medicine cost"}',now(),now() FROM med_qa;
UPDATE med_qa SET b=(SELECT business_id FROM public.profiles WHERE id=med_qa.u);
INSERT INTO public.varelia_products(id,business_id,legacy_id,name,unit,buy_price,sell_price,stock,medicine,blisters_per_box,units_per_blister,box_price,blister_price,unit_medicine_price,characteristics)
SELECT p,b,p::text,'QA medicine costs','Unidad',40,2.5,1000,true,10,10,70,10,2.5,
'[{"name":"__varelia_medicine_purchase_costs_v1__","values":[{"label":"box:40"},{"label":"blister:4"},{"label":"unit:0.4"}]}]'::jsonb FROM med_qa;
SELECT set_config('request.jwt.claim.sub',(SELECT u::text FROM med_qa),true);
DO $test$
DECLARE r jsonb; cost numeric; s text; expected numeric;
BEGIN
 FOR s,expected IN SELECT * FROM (VALUES ('pastilla',0.4),('blister',4),('caja',40)) t(s,e) LOOP
  r:=public.varelia_commit_sale(jsonb_build_array(jsonb_build_object('product_id',(SELECT p FROM med_qa),'qty',1,'sale_unit',s,'buy_price_at_sale',999)));
  cost:=(r->'items'->0->>'buy_price_at_sale')::numeric;
  IF cost IS DISTINCT FROM expected THEN RAISE EXCEPTION 'QA medicine cost % got % expected %',s,cost,expected; END IF;
 END LOOP;
 UPDATE public.varelia_products SET characteristics='[{"name":"__varelia_medicine_purchase_costs_v1__","values":[{"label":"unit:0"}]}]'::jsonb WHERE id=(SELECT p FROM med_qa);
 r:=public.varelia_commit_sale(jsonb_build_array(jsonb_build_object('product_id',(SELECT p FROM med_qa),'qty',1,'sale_unit','pastilla')));
 IF (r->'items'->0->>'buy_price_at_sale')::numeric<>0 THEN RAISE EXCEPTION 'QA explicit zero not preserved'; END IF;
 UPDATE public.varelia_products SET characteristics='[]'::jsonb,buy_price=0.6 WHERE id=(SELECT p FROM med_qa);
 r:=public.varelia_commit_sale(jsonb_build_array(jsonb_build_object('product_id',(SELECT p FROM med_qa),'qty',1,'sale_unit','pastilla')));
 IF (r->'items'->0->>'buy_price_at_sale')::numeric<>0.6 THEN RAISE EXCEPTION 'QA legacy fallback changed'; END IF;
END $test$;
SELECT 'PASS: pill 0.40, blister 4, box 40, explicit zero, legacy fallback and untrusted client cost ignored; all QA writes rolled back' AS result;
ROLLBACK;