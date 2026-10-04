package tech.vareliastore.app;

import android.Manifest;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
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
    private static MainActivity currentInstance;
    private static final int REQ_CAMERA = 201;
    private static final int REQ_FILE = 202;
    private static final int REQ_SCAN = 203;
    private static final String HOME = "https://vareliastore.tech/";
    private static final String HOME_FRESH = "https://vareliastore.tech/?native_app=1.0.25&fresh=20261004-native-pdf-v30";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingScannerTarget = "sale";
    private String pendingCartSummary = "";

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
                        + "var l=document.querySelector('.logo');if(l){l.textContent='VS';l.title='Varelia Store';}"
                        + "var h=document.querySelector('.brand h1');if(h){h.textContent='Varelia';h.id='vareliaAppName';}"
                        + "document.title='Varelia Store';"
                        + "})();";
                view.evaluateJavascript(brandJs, null);

                String receiptJs = "(function(){"
                        + "try{"
                        + "window.__vareliaAutoTicketPrintV1=true;"
                        + "if(!window.VareliaReceipt&&!document.getElementById('vareliaNativeReceiptLoader')){"
                        + "var s=document.createElement('script');"
                        + "s.id='vareliaNativeReceiptLoader';"
                        + "s.src='https://vareliastore.tech/pos-receipt.js?v=20261004-native-pdf-v30&ts='+Date.now();"
                        + "document.head.appendChild(s);"
                        + "}"
                        + "}catch(e){console.error(e);}"
                        + "})();";
                view.evaluateJavascript(receiptJs, null);

                view.postDelayed(() -> {
                    if (!isFinishing()) {
                        view.evaluateJavascript(brandJs, null);
                        view.evaluateJavascript(receiptJs, null);
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
        if (!handleIncomingUri(launch)) webView.loadUrl(HOME_FRESH);
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
