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
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {
    private static final int REQ_CAMERA = 201;
    private static final int REQ_FILE = 202;
    private static final int REQ_SCAN = 203;
    private static final String HOME = "https://vareliastore.tech/";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingScannerTarget = "sale";
    private String pendingCartSummary = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new NativeBridge(), "VareliaAndroid");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
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
        webView.loadUrl(launch != null ? launch.toString() : HOME);
    }

    private boolean handleNavigation(Uri uri) {
        if (uri == null) return false;
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
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
        return false;
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
                webView.evaluateJavascript("window.VareliaNativeScannerAction&&window.VareliaNativeScannerAction('checkout')", null);
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
        if (uri != null && webView != null) webView.loadUrl(uri.toString());
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
