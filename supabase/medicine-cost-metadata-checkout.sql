DO $patch$
DECLARE definition text; marker text;
BEGIN
 SELECT pg_get_functiondef('public.varelia_commit_sale(jsonb,text)'::regprocedure) INTO definition;
 marker := '      if v_buy_size>0 then v_cost:=v_product.buy_price*v_size/v_buy_size; end if;';
 IF strpos(definition,'Independent medicine purchase cost metadata')>0 THEN RETURN; END IF;
 IF strpos(definition,marker)=0 THEN RAISE EXCEPTION 'Unexpected sale function version'; END IF;
 definition:=replace(definition,marker,marker||$inject$

      -- Independent medicine purchase cost metadata is authoritative per presentation.
      SELECT split_part(v->>'label',':',2)::numeric INTO v_medicine_cost
      FROM jsonb_array_elements(coalesce(v_product.characteristics,'[]'::jsonb)) c
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(c->'values')='array' THEN c->'values' ELSE '[]'::jsonb END
      ) v
      WHERE c->>'name'='__varelia_medicine_purchase_costs_v1__'
        AND v->>'label' ~ ('^'||CASE WHEN v_unit='caja' THEN 'box' WHEN v_unit='blister' THEN 'blister' ELSE 'unit' END||':[0-9]+([.][0-9]+)?$')
      LIMIT 1;
      IF FOUND THEN v_cost:=v_medicine_cost; END IF;
$inject$);
 definition:=replace(definition,'  v_cost numeric;','  v_cost numeric;'||chr(10)||'  v_medicine_cost numeric;');
 EXECUTE definition;
END
$patch$;