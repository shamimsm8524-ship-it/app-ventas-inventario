BEGIN;
CREATE OR REPLACE FUNCTION public.varelia_save_supplier(p_supplier jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u uuid:=auth.uid(); b uuid; s public.varelia_suppliers%rowtype; legacy text:=btrim(p_supplier->>'id'); n text:=btrim(p_supplier->>'name');
BEGIN
 SELECT business_id INTO b FROM public.profiles WHERE id=u AND role='owner';
 IF b IS NULL THEN RAISE EXCEPTION 'Solo el propietario puede guardar proveedores'; END IF;
 IF coalesce(legacy,'')='' OR coalesce(n,'')='' OR length(n)>200 THEN RAISE EXCEPTION 'Nombre de proveedor no válido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(b::text||':supplier:'||legacy,0));
 SELECT * INTO s FROM public.varelia_suppliers WHERE business_id=b AND legacy_id=legacy ORDER BY created_at LIMIT 1 FOR UPDATE;
 IF s.id IS NULL THEN
   INSERT INTO public.varelia_suppliers(business_id,legacy_id,name) VALUES(b,legacy,n) RETURNING * INTO s;
 END IF;
 UPDATE public.varelia_suppliers SET name=n,ruc=left(p_supplier->>'ruc',40),phone=left(p_supplier->>'phone',80),email=left(p_supplier->>'email',254),address=left(p_supplier->>'address',500),notes=left(p_supplier->>'notes',4000) WHERE id=s.id RETURNING * INTO s;
 RETURN to_jsonb(s);
END $$;
CREATE OR REPLACE FUNCTION public.varelia_commit_purchase(p_request_id uuid,p_supplier_id uuid,p_items jsonb,p_document text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u uuid:=auth.uid(); b uuid; s public.varelia_suppliers%rowtype; p public.varelia_products%rowtype; x jsonb; q numeric; c numeric; total_cost numeric:=0; purchase_id uuid; result jsonb; previous record; fingerprint text;
BEGIN
 SELECT business_id INTO b FROM public.profiles WHERE id=u AND role='owner';
 IF b IS NULL THEN RAISE EXCEPTION 'Solo el propietario puede registrar compras'; END IF;
 IF p_request_id IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Compra no válida'; END IF;
 IF jsonb_array_length(p_items)<1 OR jsonb_array_length(p_items)>1000 THEN RAISE EXCEPTION 'Selecciona los productos recibidos'; END IF;
 fingerprint:=md5('purchase:'||p_supplier_id::text||p_items::text||coalesce(p_document,''));
 PERFORM pg_advisory_xact_lock(hashtextextended(b::text||u::text||p_request_id::text,0));
 SELECT * INTO previous FROM private.varelia_checkout_requests WHERE business_id=b AND user_id=u AND request_id=p_request_id;
 IF FOUND THEN
   IF previous.fingerprint<>fingerprint THEN RAISE EXCEPTION 'El intento de compra cambió; revisa el historial'; END IF;
   RETURN previous.response;
 END IF;
 SELECT * INTO s FROM public.varelia_suppliers WHERE id=p_supplier_id AND business_id=b;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proveedor no encontrado en este negocio'; END IF;
 INSERT INTO public.varelia_purchases(business_id,supplier_id,supplier_name,document_number,total,created_by)
 VALUES(b,s.id,s.name,left(p_document,200),0,u) RETURNING id INTO purchase_id;
 FOR x IN SELECT value FROM jsonb_array_elements(p_items) LOOP
   q:=round((x->>'qty')::numeric,3);c:=round((x->>'cost')::numeric,6);
   IF q IS NULL OR c IS NULL OR q<=0 OR c<0 OR q::text IN ('NaN','Infinity','-Infinity') OR c::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Cantidad o costo de compra no válido'; END IF;
   SELECT * INTO p FROM public.varelia_products WHERE id=(x->>'product_id')::uuid AND business_id=b FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado en este negocio'; END IF;
   IF jsonb_array_length(coalesce(p.variant_combinations,'[]'::jsonb))>0 THEN RAISE EXCEPTION 'Registra las cantidades por talla o color desde el producto'; END IF;
   UPDATE public.varelia_products SET stock=p.stock+q,buy_price=c,
     advanced_pricing=coalesce(advanced_pricing,'{}'::jsonb)||jsonb_build_object('purchaseCost',jsonb_build_object('quantity',q,'total',q*c)) WHERE id=p.id;
   INSERT INTO public.varelia_purchase_items(purchase_id,business_id,product_id,product_name,unit,qty,unit_cost)
   VALUES(purchase_id,b,p.id,p.name,p.unit,q,c);
   INSERT INTO public.varelia_inventory_movements(business_id,product_id,product_name,unit,type,qty,stock_before,stock_after,source,created_by)
   VALUES(b,p.id,p.name,p.unit,'purchase',q,p.stock,p.stock+q,'Ingreso de mercadería',u);
   total_cost:=total_cost+round(q*c,2);
 END LOOP;
 UPDATE public.varelia_purchases SET total=total_cost WHERE id=purchase_id;
 result:=jsonb_build_object('purchase_id',purchase_id,'total',total_cost);
 INSERT INTO private.varelia_checkout_requests(business_id,user_id,request_id,fingerprint,response) VALUES(b,u,p_request_id,fingerprint,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.varelia_save_supplier(jsonb),public.varelia_commit_purchase(uuid,uuid,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.varelia_save_supplier(jsonb),public.varelia_commit_purchase(uuid,uuid,jsonb,text) TO authenticated;
COMMIT;
