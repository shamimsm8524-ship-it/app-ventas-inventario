"restock",
    });
    if (error) throw error;
    await refreshCloud();
    await refreshPublicStock();
    return data || {};
  };

  window.vareliaCentralReturn = async function ({ saleId, saleItemId, qty }) {
    if (!saleId || !saleItemId)
      throw new Error("La venta anterior no está vinculada a la nube.");
    const { data, error } = await sb.rpc("varelia_return_sale_item", {
      p_sale_id: saleId,
      p_sale_item_id: saleItemId,
      p_qty: Math.max(1, Math.floor(Number(qty) || 1)),
    });
    if (error) throw error;
    await refreshCloud();
    await refreshPublicStock();
    return data || {};
  };

  function subscribe() {
    try {
      if (channel) sb.removeChannel(channel);
      channel = sb
        .channel("varelia-stock-" + businessId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "varelia_products",
            filter: "business_id=eq." + businessId,
          },
          scheduleRefresh
        )
        .subscribe();
    } catch (e) {
      console.warn("Realtime stock", e);
    }
  }

  async function init() {
    try {
      if (!(await waitClient())) return;
      if (!(await loadProfile()) || !businessId) return;
      await seedIfNeeded();
      await refreshCloud();
      installProductBridge();
      installCategoryBridge();
      installCategoryDeleteBridge();
      installCheckoutBridge();
      subscribe();

      let tries = 0;
      const timer = setInterval(() => {
        tries++;
        installProductBridge();
        installCategoryBridge();
        installCategoryDeleteBridge();
        installCheckoutBridge();
        if (tries > 60) clearInterval(timer);
      }, 500);

      addEventListener("focus", scheduleRefresh);
      addEventListener("pageshow", scheduleRefresh);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") scheduleRefresh();
      });
    } catch (e) {
      console.error("Varelia central stock", e);
      toast(
        "No se pudo activar la sincronización central del inventario. Tus datos locales no fueron borrados.",
        "warn"
      );
    }
  }

  window.addEventListener(
    "varelia:business-scope-ready",
    () => setTimeout(init, 80),
    { once: true }
  );
  setTimeout(init, 350);
})();
