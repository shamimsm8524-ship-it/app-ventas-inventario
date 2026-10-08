package tech.vareliastore.app;

import android.Manifest;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {
    // Build PDF thermal parity V106
    // Build refresh PDF parity V105
    private static MainActivity currentInstance;
    private static final int REQ_CAMERA = 201;
    private static final int REQ_FILE = 202;
    private static final int REQ_SCAN = 203;
    private static final String HOME = "https://vareliastore.tech/";
    private static final String HOME_FRESH = "https://vareliastore.tech/?native_app=1.0.50&fresh=20261008-varelia-final&native_clean=1";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingScannerTarget = "sale";
    private String pendingCartSummary = "";
    private WebView printWebView;

    private String safePdfName(String value) {
        String s = value == null ? "" : value.replaceAll("[^A-Za-z0-9_-]+", "-");
        if (s.isEmpty()) s = String.valueOf(System.currentTimeMillis());
        return s;
    }

    private float drawPdfText(Canvas canvas, Paint paint, String text, float x, float y, float maxWidth, float lineHeight) {
        if (text == null) text = "";
        String[] words = text.trim().split("\\s+");
        StringBuilder line = new StringBuilder();
        for (String word : words) {
            String test = line.length() == 0 ? word : line + " " + word;
            if (paint.measureText(test) > maxWidth && line.length() > 0) {
                canvas.drawText(line.toString(), x, y, paint);
                y += lineHeight;
                line.setLength(0);
                line.append(word);
            } else {
                if (line.length() > 0) line.append(" ");
                line.append(word);
            }
        }
        if (line.length() > 0) {
            canvas.drawText(line.toString(), x, y, paint);
            y += lineHeight;
        }
        return y;
    }

    private String escHtml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }

    private void printSaleReceiptNative(String saleJson) {
        runOnUiThread(() -> {
            try {
                JSONObject data = new JSONObject(saleJson == null ? "{}" : saleJson);
                JSONArray items = data.optJSONArray("items");
                JSONObject breakdown = data.optJSONObject("breakdown");

                String business = escHtml(data.optString("business", "Varelia"));
                String logo = escHtml(data.optString("logo", ""));
                String ruc = escHtml(data.optString("ruc", ""));
                String phone = escHtml(data.optString("phone", ""));
                String address = escHtml(data.optString("address", ""));
                String message = escHtml(data.optString("message", "Gracias por su compra."));
                String ticket = escHtml(data.optString("ticket", "V-" + System.currentTimeMillis()));
                String date = escHtml(data.optString("date", ""));
                String method = escHtml(data.optString("method", "Efectivo"));
                String seller = escHtml(data.optString("seller", ""));
                String customer = escHtml(data.optString("customer", ""));
                String thermalWidth = data.optString("thermalWidth", "80");
                double total = data.optDouble("total", 0);
                double received = data.optDouble("received", 0);
                double change = data.optDouble("change", 0);

                StringBuilder rows = new StringBuilder();
                if (items != null) {
                    for (int i = 0; i < items.length(); i++) {
                        JSONObject it = items.optJSONObject(i);
                        if (it == null) continue;
                        double qty = it.optDouble("qty", 0);
                        double price = it.optDouble("price", 0);
                        double subtotal = it.optDouble("subtotal", qty * price);
                        boolean weighted = "weight".equalsIgnoreCase(it.optString("saleType", ""))
                                || "kg".equalsIgnoreCase(it.optString("unit", ""))
                                || it.optBoolean("byWeight", false)
                                || (qty > 0 && Math.abs(qty - Math.rint(qty)) > 0.000001);
                        String meta;
                        if (weighted) {
                            String weightText = qty < 1
                                    ? String.format(Locale.US, "%d g", Math.round(qty * 1000))
                                    : String.format(Locale.US, "%.3g kg", qty);
                            meta = "Peso: " + weightText + "<br>Precio por kilo: S/ " + String.format(Locale.US, "%.2f", price);
                        } else {
                            meta = String.format(Locale.US, "%.3g × S/ %.2f", qty, price);
                        }
                        rows.append("<div class='item'><div><b>")
                                .append(escHtml(it.optString("name", "Producto")))
                                .append("</b><small>")
                                .append(meta)
                                .append("</small></div><b>S/ ")
                                .append(String.format(Locale.US, "%.2f", subtotal))
                                .append("</b></div>");
                    }
                }

                StringBuilder pays = new StringBuilder();
                if (breakdown != null) {
                    java.util.Iterator<String> keys = breakdown.keys();
                    while (keys.hasNext()) {
                        String k = keys.next();
                        double v = breakdown.optDouble(k, 0);
                        if (v <= 0) continue;
                        pays.append("<div class='line'><span>")
                                .append(escHtml(k))
                                .append("</span><b>S/ ")
                                .append(String.format(Locale.US, "%.2f", v))
                                .append("</b></div>");
                    }
                }

                String logoHtml = logo.isEmpty() ? "" :
                        "<div class='logo'><img src='" + logo + "' alt='Logo'></div>";
                String businessInfo =
                        (ruc.isEmpty() ? "" : "<div class='center muted'>RUC/Doc: " + ruc + "</div>") +
                        (phone.isEmpty() ? "" : "<div class='center muted'>Tel: " + phone + "</div>") +
                        (address.isEmpty() ? "" : "<div class='center muted'>" + address + "</div>");
                String people =
                        (customer.isEmpty() ? "" : "<div class='line'><span>Cliente</span><span>" + customer + "</span></div>") +
                        (seller.isEmpty() ? "" : "<div class='line'><span>Vendedor</span><span>" + seller + "</span></div>");
                String payDetail = pays.toString()
                        + (received > 0 ? "<div class='line'><span>Recibido</span><b>S/ " + String.format(Locale.US, "%.2f", received) + "</b></div>" : "")
                        + "<div class='line'><span>Vuelto</span><b>S/ " + String.format(Locale.US, "%.2f", change) + "</b></div>";

                String html = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
                        + "<style>"
                        + "@page{margin:3mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}"
                        + "body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}"
                        + ".paper{width:76mm;max-width:100%;margin:0 auto;padding:3mm 2.5mm}.logo{text-align:center;margin:0 0 2mm}.logo img{display:block;margin:0 auto;max-width:26mm;max-height:18mm;width:auto;height:auto;object-fit:contain}"
                        + "h2{text-align:center;margin:0;font-size:17px}.center{text-align:center}.muted{color:#555;font-size:9px;line-height:1.3}.sep{border-top:1px dashed #777;margin:2.2mm 0}"
                        + ".line,.item,.total{display:flex;justify-content:space-between;gap:2mm;margin:1.4mm 0;align-items:flex-start;font-size:10px}.item small{display:block;color:#555;margin-top:.7mm;font-size:9px}"
                        + ".total{font-size:17px;font-weight:900;margin-top:2mm}.note{text-align:center;font-size:8px;line-height:1.35;margin-top:3mm;color:#555}"
                        + "</style></head><body><div class='paper'>"
                        + logoHtml
                        + "<h2>" + business + "</h2><div class='center muted'>COMPROBANTE INTERNO DE VENTA</div>"
                        + businessInfo
                        + "<div class='sep'></div>"
                        + "<div class='line'><span>N.º</span><b>" + ticket + "</b></div>"
                        + "<div class='line'><span>Fecha</span><span>" + date + "</span></div>"
                        + "<div class='line'><span>Pago</span><span>" + method + "</span></div>"
                        + people
                        + "<div class='sep'></div>" + rows
                        + "<div class='sep'></div><div class='total'><span>TOTAL</span><span>S/ " + String.format(Locale.US, "%.2f", total) + "</span></div>"
                        + "<div class='sep'></div>" + payDetail
                        + "<div class='note'>" + message + "<br>Este ticket es un comprobante interno y no reemplaza una boleta o factura electrónica SUNAT.</div>"
                        + "</div></body></html>";

                printWebView = new WebView(MainActivity.this);
                printWebView.getSettings().setJavaScriptEnabled(false);
                printWebView.setWebViewClient(new WebViewClient() {
                    boolean started = false;
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (started) return;
                        started = true;
                        try {
                            PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                            PrintDocumentAdapter adapter = view.createPrintDocumentAdapter("Varelia-" + ticket);
                            printManager.print("Comprobante " + ticket, adapter, null);
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this,
                                    "No se pudo abrir la impresión.", Toast.LENGTH_LONG).show();
                        }
                    }
                });
                // Mismo mecanismo de la versión anterior de Varelia que sí abría
                // el diálogo de impresión en este dispositivo.
                printWebView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            } catch (Exception e) {
                Toast.makeText(MainActivity.this,
                        "No se pudo preparar el comprobante para imprimir.", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void saveSalePdfNative(String saleJson) {
        try {
            JSONObject data = new JSONObject(saleJson == null ? "{}" : saleJson);
            JSONArray items = data.optJSONArray("items");
            JSONObject breakdown = data.optJSONObject("breakdown");
            int itemCount = items == null ? 0 : items.length();
            int paymentCount = breakdown == null ? 0 : breakdown.length();
            int pageHeight = Math.max(842, 430 + itemCount * 58 + paymentCount * 34);

            PdfDocument document = new PdfDocument();
            PdfDocument.PageInfo info = new PdfDocument.PageInfo.Builder(595, pageHeight, 1).create();
            PdfDocument.Page page = document.startPage(info);
            Canvas canvas = page.getCanvas();

            Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
            paint.setColor(Color.BLACK);
            paint.setTextSize(22f);
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            float y = 38f;
            String logoData = data.optString("logo", "");
            if (logoData.startsWith("data:image") && logoData.contains(",")) {
                try {
                    String encoded = logoData.substring(logoData.indexOf(',') + 1);
                    byte[] logoBytes = android.util.Base64.decode(encoded, android.util.Base64.DEFAULT);
                    android.graphics.Bitmap logoBitmap = android.graphics.BitmapFactory.decodeByteArray(logoBytes, 0, logoBytes.length);
                    if (logoBitmap != null) {
                        float maxW = 54f, maxH = 34f;
                        float scale = Math.min(maxW / logoBitmap.getWidth(), maxH / logoBitmap.getHeight());
                        float w = logoBitmap.getWidth() * scale, h = logoBitmap.getHeight() * scale;
                        android.graphics.RectF dst = new android.graphics.RectF((595f-w)/2f, y, (595f+w)/2f, y+h);
                        canvas.drawBitmap(logoBitmap, null, dst, paint);
                        y += h + 28f;
                    }
                } catch (Exception ignored) {}
            }
            String business = data.optString("business", "Varelia");
            paint.setTextAlign(Paint.Align.CENTER);
            y = drawPdfText(canvas, paint, business, 297.5f, y, 515f, 28f);
            paint.setTextAlign(Paint.Align.LEFT);

            paint.setTextSize(14f);
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
            paint.setTextAlign(Paint.Align.CENTER);
            canvas.drawText("COMPROBANTE INTERNO DE VENTA", 297.5f, y + 5f, paint);
            y += 24f;
            String ruc = data.optString("ruc", "");
            String phone = data.optString("phone", "");
            String address = data.optString("address", "");
            if (!ruc.isEmpty()) { canvas.drawText("RUC/Doc: " + ruc, 297.5f, y, paint); y += 19f; }
            if (!phone.isEmpty()) { canvas.drawText("Tel: " + phone, 297.5f, y, paint); y += 19f; }
            if (!address.isEmpty()) { canvas.drawText(address, 297.5f, y, paint); y += 19f; }
            paint.setTextAlign(Paint.Align.LEFT);
            y += 10f;

            String ticket = data.optString("ticket", "V-" + System.currentTimeMillis());
            canvas.drawText("N.º: " + ticket, 40f, y, paint); y += 22f;
            canvas.drawText("Fecha: " + data.optString("date", ""), 40f, y, paint); y += 22f;
            canvas.drawText("Pago: " + data.optString("method", "Efectivo"), 40f, y, paint); y += 22f;
            canvas.drawText("Vendedor: " + data.optString("seller", "Usuario"), 40f, y, paint); y += 26f;

            paint.setStrokeWidth(1f);
            canvas.drawLine(40f, y, 555f, y, paint); y += 24f;

            if (items != null) {
                for (int i = 0; i < items.length(); i++) {
                    JSONObject it = items.optJSONObject(i);
                    if (it == null) continue;
                    paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
                    paint.setTextSize(14f);
                    y = drawPdfText(canvas, paint, it.optString("name", "Producto"), 40f, y, 360f, 18f);
                    paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
                    paint.setTextSize(12f);
                    double qty = it.optDouble("qty", 0);
                    double price = it.optDouble("price", 0);
                    double subtotal = it.optDouble("subtotal", qty * price);
                    boolean weighted = "weight".equalsIgnoreCase(it.optString("saleType", ""))
                            || "kg".equalsIgnoreCase(it.optString("unit", ""))
                            || it.optBoolean("byWeight", false)
                            || (qty > 0 && Math.abs(qty - Math.rint(qty)) > 0.000001);
                    if (weighted) {
                        String weightText = qty < 1
                                ? String.format(Locale.US, "%d g", Math.round(qty * 1000))
                                : String.format(Locale.US, "%.3g kg", qty);
                        canvas.drawText("Peso: " + weightText, 40f, y, paint);
                        y += 18f;
                        canvas.drawText(String.format(Locale.US, "Precio por kilo: S/ %.2f", price), 40f, y, paint);
                    } else {
                        String line = String.format(Locale.US, "%.3g x S/ %.2f", qty, price);
                        canvas.drawText(line, 40f, y, paint);
                    }
                    paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
                    paint.setTextAlign(Paint.Align.RIGHT);
                    canvas.drawText(String.format(Locale.US, "S/ %.2f", subtotal), 555f, y, paint);
                    paint.setTextAlign(Paint.Align.LEFT);
                    y += 28f;
                }
            }

            canvas.drawLine(40f, y, 555f, y, paint); y += 28f;
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            paint.setTextSize(20f);
            canvas.drawText("TOTAL", 40f, y, paint);
            paint.setTextAlign(Paint.Align.RIGHT);
            canvas.drawText(String.format(Locale.US, "S/ %.2f", data.optDouble("total", 0)), 555f, y, paint);
            paint.setTextAlign(Paint.Align.LEFT);
            y += 32f;

            if (breakdown != null && breakdown.length() > 0) {
                paint.setTextSize(13f);
                java.util.Iterator<String> keys = breakdown.keys();
                while (keys.hasNext()) {
                    String k = keys.next();
                    double v = breakdown.optDouble(k, 0);
                    paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
                    canvas.drawText(k, 40f, y, paint);
                    paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
                    paint.setTextAlign(Paint.Align.RIGHT);
                    canvas.drawText(String.format(Locale.US, "S/ %.2f", v), 555f, y, paint);
                    paint.setTextAlign(Paint.Align.LEFT);
                    y += 22f;
                }
            }

            paint.setTextSize(13f);
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
            canvas.drawText("Recibido", 40f, y, paint);
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            paint.setTextAlign(Paint.Align.RIGHT);
            canvas.drawText(String.format(Locale.US, "S/ %.2f", data.optDouble("received", 0)), 555f, y, paint);
            paint.setTextAlign(Paint.Align.LEFT);
            y += 22f;
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
            canvas.drawText("Vuelto", 40f, y, paint);
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            paint.setTextAlign(Paint.Align.RIGHT);
            canvas.drawText(String.format(Locale.US, "S/ %.2f", data.optDouble("change", 0)), 555f, y, paint);
            paint.setTextAlign(Paint.Align.LEFT);
            y += 30f;

            paint.setTextSize(10f);
            paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
            String message = data.optString("message", "Gracias por su compra.");
            if (!message.isEmpty()) {
                y = drawPdfText(canvas, paint, message, 40f, y, 515f, 14f);
                y += 4f;
            }
            y = drawPdfText(canvas, paint,
                    "Este ticket es un comprobante interno y no reemplaza una boleta o factura electrónica SUNAT.",
                    40f, y, 515f, 14f);

            document.finishPage(page);

            String fileName = "comprobante-" + safePdfName(ticket) + ".pdf";
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            cv.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
            cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Varelia");
            Uri outUri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
            if (outUri == null) throw new IllegalStateException("No se pudo crear el PDF");
            try (OutputStream os = getContentResolver().openOutputStream(outUri)) {
                if (os == null) throw new IllegalStateException("No se pudo escribir el PDF");
                document.writeTo(os);
            }
            document.close();

            runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "PDF guardado en Descargas/Varelia", Toast.LENGTH_LONG).show());
        } catch (Exception e) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "No se pudo generar el comprobante PDF.", Toast.LENGTH_LONG).show());
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        currentInstance = this;

        // Mantener Varelia dentro del área segura del teléfono, igual que apps
        // nativas como Facebook: nada debe quedar debajo de la hora ni de los
        // botones de navegación de Android.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightStatusBars(true);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView())
                .setAppearanceLightNavigationBars(true);

        FrameLayout safeRoot = new FrameLayout(this);
        safeRoot.setBackgroundColor(Color.WHITE);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        safeRoot.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(safeRoot);

        ViewCompat.setOnApplyWindowInsetsListener(safeRoot, (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(0, bars.top, 0, bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(safeRoot);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        // Respetar el viewport móvil real. "Overview mode" hacía que toda la app
        // se encogiera como si fuera una página de escritorio dentro del WebView.
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setTextZoom(100);
        s.setDefaultFontSize(16);
        s.setMinimumFontSize(8);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.clearCache(true);
        webView.addJavascriptInterface(new NativeBridge(), "VareliaAndroid");

        webView.setWebViewClient(new WebViewClient() {
            private WebResourceResponse blockLegacyAutoTicket(Uri uri) {
                if (uri == null) return null;
                String path = uri.getPath() == null ? "" : uri.getPath();
                if (path.endsWith("/auto-ticket-print.js")
                        || path.endsWith("/pos-receipt-20260930-17.js")) {
                    String stub = "window.__vareliaAutoTicketPrintV1=true;"
                            + "console.log('Varelia: flujo antiguo de ticket bloqueado por la APK');";
                    return new WebResourceResponse(
                            "application/javascript",
                            "UTF-8",
                            new ByteArrayInputStream(stub.getBytes(StandardCharsets.UTF_8)));
                }
                return null;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse blocked = blockLegacyAutoTicket(request == null ? null : request.getUrl());
                if (blocked != null) return blocked;
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                WebResourceResponse blocked = null;
                try { blocked = blockLegacyAutoTicket(Uri.parse(url)); } catch (Exception ignored) {}
                if (blocked != null) return blocked;
                return super.shouldInterceptRequest(view, url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                String brandJs = "(function(){"
                        + "var l=document.querySelector('.logo');if(l){l.title='Varelia Store';}"
                        + "var h=document.querySelector('.brand h1');if(h){h.textContent='Varelia';h.id='vareliaAppName';}"
                        + "var m=document.querySelector('.brand .meta');if(m&&!m.dataset.nativeVersion){m.dataset.nativeVersion='1';m.textContent=(m.textContent||'Ventas e inventario').replace(/\\s·\\sv\\d+(?:\\.\\d+){2}$/,'')+' · v1.0.50';}"
                        + "document.title='Varelia Store';"
                        + "})();";
                view.evaluateJavascript(brandJs, null);

                String receiptJs = "(function(){"
                        + "try{"
                        + "window.__vareliaAutoTicketPrintV1=true;"
                        + "if(!window.VareliaReceipt&&!document.getElementById('vareliaNativeReceiptLoader')){"
                        + "var s=document.createElement('script');"
                        + "s.id='vareliaNativeReceiptLoader';"
                        + "s.src='https://vareliastore.tech/pos-receipt.js?v=20261008-receipt-download-free-v7&ts='+Date.now();"
                        + "document.head.appendChild(s);"
                        + "}"
                        + "}catch(e){console.error(e);}"
                        + "})();";
                view.evaluateJavascript(receiptJs, null);

                // La impresión ya NO se dispara al cobrar. El comprobante se muestra en Varelia
                // y el usuario decide entre Imprimir o Descargar PDF.
                String nativePdfHookJs = "(function(){try{\nwindow.__vareliaNativePdfHookV2=true;window.__vareliaReceiptPremiumFreeV3=true;\nfunction f(){try{\nvar ov=document.querySelector('#vreceiptOverlay');\nif(!ov||!ov.classList.contains('show'))return;\nvar t=(document.body&&document.body.innerText||\"\");\nif(!/premium/i.test(t)||!/(S\\/?\\.?\\s*28|28\\s*soles|pagar|descargar)/i.test(t))return;\ndocument.querySelectorAll('body *').forEach(function(el){try{\nvar s=(el.innerText||\"\").trim();\nif(s.length>0&&s.length<700&&/premium/i.test(s)&&/(28\\s*soles|S\\/?\\.?\\s*28|pagar)/i.test(s)){\nvar q=el.closest('dialog,.modal,.overlay,[role=dialog]')||el;\nif(q&&q!==ov)q.style.setProperty('display','none','important');\n}}catch(e){}});\nif(typeof window.__vareliaDownloadCurrentReceipt==='function'){\nsetTimeout(function(){window.__vareliaDownloadCurrentReceipt();},60);\n}\n}catch(e){}}\nwindow.__vareliaReceiptPremiumFreeTimer=setInterval(f,220);f();\n}catch(e){}})();";
                view.evaluateJavascript(nativePdfHookJs, null);

                // Limpiar Service Workers heredados de versiones antiguas. Esto evita que una
                // versión vieja de la interfaz quede atrapada aunque el WebView no use caché.
                if (url != null && url.contains("native_clean=1")) {
                    String swCleanJs = "(async function(){try{if(navigator.serviceWorker){var rs=await navigator.serviceWorker.getRegistrations();for(var i=0;i<rs.length;i++){try{await rs[i].unregister();}catch(e){}}}var u=new URL(location.href);u.searchParams.set('native_clean','2');u.searchParams.set('ts',Date.now().toString());location.replace(u.toString());}catch(e){console.error(e);}})();";
                    view.evaluateJavascript(swCleanJs, null);
                }

                view.postDelayed(() -> {
                    if (!isFinishing()) {
                        view.evaluateJavascript(brandJs, null);
                        view.evaluateJavascript(receiptJs, null);
                        view.evaluateJavascript(nativePdfHookJs, null);
                    }
                }, 700);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                            != PackageManager.PERMISSION_GRANTED) {
                        ActivityCompat.requestPermissions(MainActivity.this,
                                new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, REQ_CAMERA);
                    }
                    try {
                        request.grant(request.getResources());
                    } catch (Exception e) {
                        request.deny();
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback,
                                             FileChooserParams fileChooserParams) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent;
                try {
                    intent = fileChooserParams.createIntent();
                } catch (Exception e) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.setType("*/*");
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                }
                try {
                    startActivityForResult(Intent.createChooser(intent, "Seleccionar archivo"), REQ_FILE);
                    return true;
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, "No se encontró un selector de archivos.", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
            if (url != null && url.startsWith("blob:")) {
                String name = URLUtil.guessFileName("archivo", contentDisposition, mimetype);
                String js = "(async()=>{try{const r=await fetch(" + JSONObject.quote(url) + ");"
                        + "const b=await r.blob();const rd=new FileReader();"
                        + "rd.onloadend=()=>VareliaAndroid.saveDataUrl(rd.result," + JSONObject.quote(name) + ");"
                        + "rd.readAsDataURL(b)}catch(e){console.error(e)}})()";
                webView.evaluateJavascript(js, null);
                return;
            }
            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setMimeType(mimetype);
                req.addRequestHeader("User-Agent", userAgent);
                String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                req.setTitle(filename);
                req.setDescription("Descargando desde Varelia");
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(req);
                Toast.makeText(this, "Descargando " + filename, Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "No se pudo descargar el archivo.", Toast.LENGTH_SHORT).show();
            }
        });

        Uri launch = getIntent() != null ? getIntent().getData() : null;
        if (!handleIncomingUri(launch)) {
            // La app puede conservar un Service Worker antiguo aunque WebView use LOAD_NO_CACHE.
            // Lo eliminamos una vez y forzamos una carga nueva del sitio para que la APK no muestre
            // la interfaz vieja de Reportes/Ticket promedio.
            String cleanUrl = HOME_FRESH + "&ts=" + System.currentTimeMillis();
            webView.loadUrl(cleanUrl);
        }
    }

    private boolean handleIncomingUri(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
        String path = uri.getPath() == null ? "" : uri.getPath();

        if ("varelia".equals(scheme) && "auth".equals(host)) {
            String accessToken = uri.getQueryParameter("access_token");
            String refreshToken = uri.getQueryParameter("refresh_token");
            if (accessToken != null && !accessToken.isEmpty()
                    && refreshToken != null && !refreshToken.isEmpty()) {
                String url = HOME
                        + "?native_access_token=" + Uri.encode(accessToken)
                        + "&native_refresh_token=" + Uri.encode(refreshToken);
                webView.loadUrl(url);
            } else {
                webView.loadUrl(HOME);
                Toast.makeText(this, "No se pudo recuperar la sesión de Google.", Toast.LENGTH_LONG).show();
            }
            return true;
        }

        if (("http".equals(scheme) || "https".equals(scheme))
                && "vareliastore.tech".equals(host)
                && "/auth-callback.html".equals(path)) {
            String code = uri.getQueryParameter("code");
            if (code != null && !code.isEmpty()) {
                webView.loadUrl(HOME + "?code=" + Uri.encode(code));
            } else {
                String error = uri.getQueryParameter("error_description");
                webView.loadUrl(HOME);
                if (error != null && !error.isEmpty()) {
                    Toast.makeText(this, "Google no pudo completar el acceso: " + error, Toast.LENGTH_LONG).show();
                }
            }
            return true;
        }

        return false;
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) return false;
        if (handleIncomingUri(uri)) return true;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);

        if (("http".equals(scheme) || "https".equals(scheme))
                && (host.equals("vareliastore.tech") || host.endsWith(".vareliastore.tech"))) {
            return false;
        }

        if ("http".equals(scheme) || "https".equals(scheme)
                || "mailto".equals(scheme) || "tel".equals(scheme)
                || "sms".equals(scheme) || "whatsapp".equals(scheme)
                || "intent".equals(scheme)) {
            try {
                Uri outgoing = forceNativeOAuthReturn(uri);
                startActivity(new Intent(Intent.ACTION_VIEW, outgoing));
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
        return false;
    }

    private Uri forceNativeOAuthReturn(Uri uri) {
        if (uri == null) return null;
        try {
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            String path = uri.getPath() == null ? "" : uri.getPath();

            // Cuando el OAuth nace dentro de la APK, obliga a que Supabase vuelva
            // al callback marcado como flujo nativo. Así Chrome no se queda con Varelia.
            if (host.endsWith(".supabase.co") && path.contains("/auth/v1/authorize")) {
                String redirect = uri.getQueryParameter("redirect_to");
                if (redirect != null && redirect.startsWith("https://vareliastore.tech/auth-callback.html")) {
                    String nativeRedirect = "https://vareliastore.tech/auth-callback.html?app=1";
                    Uri.Builder b = uri.buildUpon().clearQuery();
                    for (String name : uri.getQueryParameterNames()) {
                        if ("redirect_to".equals(name)) {
                            b.appendQueryParameter(name, nativeRedirect);
                        } else {
                            for (String value : uri.getQueryParameters(name)) {
                                b.appendQueryParameter(name, value);
                            }
                        }
                    }
                    return b.build();
                }
            }
        } catch (Exception ignored) {}
        return uri;
    }

    private void startNativeScanner(String target) {
        startNativeScanner(target, pendingCartSummary);
    }

    private void startNativeScanner(String target, String cartSummary) {
        pendingScannerTarget = (target == null || target.isEmpty()) ? "sale" : target;
        pendingCartSummary = cartSummary == null ? "" : cartSummary;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
            return;
        }
        Intent i = new Intent(this, NativeScannerActivity.class);
        i.putExtra("target", pendingScannerTarget);
        i.putExtra("cartSummary", pendingCartSummary);
        startActivityForResult(i, REQ_SCAN);
    }

    public class NativeBridge {
        @JavascriptInterface
        public void openScanner(String target) {
            runOnUiThread(() -> startNativeScanner(target, ""));
        }

        @JavascriptInterface
        public void openScannerWithCart(String target, String cartSummary) {
            runOnUiThread(() -> startNativeScanner(target, cartSummary));
        }

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public String getAppVersion() {
            return "1.0.48";
        }

        @JavascriptInterface
        public void openExternal(String url) {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "No se pudo abrir el enlace.", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void printSaleReceipt(String saleJson) {
            printSaleReceiptNative(saleJson);
        }

        @JavascriptInterface
        public void saveSalePdf(String saleJson) {
            saveSalePdfNative(saleJson);
        }

        @JavascriptInterface
        public void saveDataUrl(String dataUrl, String fileName) {
            try {
                int comma = dataUrl.indexOf(',');
                if (comma < 0) return;
                String header = dataUrl.substring(0, comma);
                String encoded = dataUrl.substring(comma + 1);
                byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
                String mime = "application/octet-stream";
                if (header.startsWith("data:")) {
                    int semi = header.indexOf(';');
                    if (semi > 5) mime = header.substring(5, semi);
                }
                String name = (fileName == null || fileName.trim().isEmpty()) ? "Varelia_archivo" : fileName;
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
                cv.put(MediaStore.Downloads.MIME_TYPE, mime);
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Varelia");
                Uri outUri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (outUri == null) throw new IllegalStateException("No se pudo crear el archivo");
                try (OutputStream os = getContentResolver().openOutputStream(outUri)) {
                    if (os == null) throw new IllegalStateException("No se pudo escribir el archivo");
                    os.write(bytes);
                }
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                        "Archivo guardado en Descargas/Varelia", Toast.LENGTH_LONG).show());
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                        "No se pudo guardar el archivo.", Toast.LENGTH_SHORT).show());
            }
        }
    }

    public static void handleLiveSaleScan(String code) {
        MainActivity a = currentInstance;
        if (a == null || a.webView == null || code == null || code.trim().isEmpty()) return;
        a.runOnUiThread(() -> {
            String js = "(function(){try{return window.VareliaNativeAddSaleAndSummary?"
                    + "window.VareliaNativeAddSaleAndSummary(" + JSONObject.quote(code.trim()) + "):'';"
                    + "}catch(e){return '⚠ Error al agregar producto';}})()";
            a.webView.evaluateJavascript(js, value -> {
                String summary = "";
                try {
                    if (value != null && !"null".equals(value)) {
                        summary = new JSONArray("[" + value + "]").getString(0);
                    }
                } catch (Exception ignored) {}
                NativeScannerActivity.updateCartSummary(summary);
            });
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQ_FILE) {
            if (fileCallback != null) {
                Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
                fileCallback.onReceiveValue(result);
                fileCallback = null;
            }
            return;
        }

        if (requestCode == REQ_SCAN && resultCode == RESULT_OK && data != null) {
            String action = data.getStringExtra("action");
            if ("checkout".equals(action)) {
                final String js = "window.VareliaNativeScannerAction&&window.VareliaNativeScannerAction('checkout')";
                webView.postDelayed(() -> webView.evaluateJavascript(js, null), 140);
                webView.postDelayed(() -> {
                    String retry = "(function(){var d=document.getElementById('saleDialog');"
                            + "if(!d||!d.open){window.VareliaNativeScannerAction&&window.VareliaNativeScannerAction('checkout');}})()";
                    webView.evaluateJavascript(retry, null);
                }, 520);
                return;
            }
            String code = data.getStringExtra("code");
            String target = data.getStringExtra("target");
            if (code != null && !code.isEmpty()) {
                String js = "window.VareliaNativeScanResult&&window.VareliaNativeScanResult("
                        + JSONObject.quote(target == null ? pendingScannerTarget : target) + ","
                        + JSONObject.quote(code) + ")";
                webView.evaluateJavascript(js, null);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA) {
            boolean ok = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (ok) startNativeScanner(pendingScannerTarget);
            else Toast.makeText(this, "Varelia necesita permiso de cámara para escanear.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri uri = intent.getData();
        if (uri != null && webView != null && !handleIncomingUri(uri)) {
            webView.loadUrl(uri.toString());
        }
    }

    @Override
    protected void onDestroy() {
        if (currentInstance == this) currentInstance = null;
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
