BEGIN;
CREATE OR REPLACE FUNCTION public.varelia_adjust_stock(p_product_id uuid,p_qty numeric,p_event text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE u uuid:=auth.uid(); b uuid; p public.varelia_products%rowtype; q numeric:=round(p_qty,6); next_stock numeric;
BEGIN
 SELECT business_id INTO b FROM public.profiles WHERE id=u AND role='owner';
 IF b IS NULL THEN RAISE EXCEPTION 'Solo el propietario puede ajustar inventario'; END IF;
 IF q IS NULL OR q<=0 OR q::text IN ('NaN','Infinity','-Infinity') OR p_event IS NULL OR p_event NOT IN ('add','subtract') THEN RAISE EXCEPTION 'Movimiento no válido'; END IF;
 SELECT * INTO p FROM public.varelia_products WHERE id=p_product_id AND business_id=b FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;
 IF jsonb_array_length(coalesce(p.variant_combinations,'[]'::jsonb))>0 THEN RAISE EXCEPTION 'Edita las cantidades por talla o color en el producto'; END IF;
 next_stock:=p.stock+CASE WHEN p_event='add' THEN q ELSE -q END;
 IF next_stock<0 THEN RAISE EXCEPTION 'Stock insuficiente'; END IF;
 UPDATE public.varelia_products SET stock=next_stock WHERE id=p.id;
 INSERT INTO public.varelia_inventory_movements(business_id,product_id,product_name,unit,type,qty,stock_before,stock_after,source,created_by)
 VALUES(b,p.id,p.name,p.unit,p_event,q,p.stock,next_stock,'Ajuste manual',u);
 RETURN jsonb_build_object('stock_before',p.stock,'stock_after',next_stock,'product_id',p.id);
END $$;
REVOKE ALL ON FUNCTION public.varelia_adjust_stock(uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.varelia_adjust_stock(uuid,numeric,text) TO authenticated;
COMMIT;
