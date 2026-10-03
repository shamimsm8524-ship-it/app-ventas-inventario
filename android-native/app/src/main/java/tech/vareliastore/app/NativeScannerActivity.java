package tech.vareliastore.app;

import android.content.Intent;
import android.content.Context;
import android.graphics.Color;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Size;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraInfo;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.Preview;
import androidx.camera.camera2.interop.Camera2CameraControl;
import androidx.camera.camera2.interop.Camera2CameraInfo;
import androidx.camera.camera2.interop.CaptureRequestOptions;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class NativeScannerActivity extends AppCompatActivity {
    private static NativeScannerActivity currentScanner;
    private PreviewView previewView;
    private Camera camera;
    private BarcodeScanner scanner;
    private ExecutorService cameraExecutor;
    private final AtomicBoolean returning = new AtomicBoolean(false);
    private boolean torchOn = false;
    private Button torchButton;
    private String activeCameraId = null;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String target = "sale";
    private String cartSummary = "";
    private TextView cartHistory;
    private String lastCode = "";
    private long lastScanAt = 0L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        currentScanner = this;
        target = getIntent().getStringExtra("target");
        if (target == null || target.isEmpty()) target = "sale";
        cartSummary = getIntent().getStringExtra("cartSummary");
        if (cartSummary == null) cartSummary = "";

        cameraExecutor = Executors.newSingleThreadExecutor();
        scanner = BarcodeScanning.getClient();

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        // Mantener todos los controles dentro del área segura del teléfono:
        // debajo de la barra de estado y por encima de los botones de Android.
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(0, bars.top, 0, bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(root);

        previewView = new PreviewView(this);
        previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        root.addView(previewView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        TextView hint = new TextView(this);
        hint.setText("Apunta al código de barras");
        hint.setTextColor(Color.WHITE);
        hint.setTextSize(18);
        hint.setGravity(Gravity.CENTER);
        hint.setPadding(18, 16, 18, 16);
        hint.setBackgroundColor(0x88000000);
        FrameLayout.LayoutParams hintLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        hintLp.gravity = Gravity.TOP;
        hintLp.setMargins(24, 40, 24, 0);
        root.addView(hint, hintLp);

        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setPadding(14, 12, 14, 14);
        bottom.setBackgroundColor(0xAA000000);

        if ("sale".equals(target)) {
            cartHistory = new TextView(this);
            cartHistory.setText(cartSummary.trim().isEmpty()
                    ? "🛒 Carrito de compras\nAún no hay productos."
                    : cartSummary);
            cartHistory.setTextColor(Color.WHITE);
            cartHistory.setTextSize(13);
            cartHistory.setPadding(8, 4, 8, 10);
            cartHistory.setMaxLines(9);
            cartHistory.setVerticalScrollBarEnabled(true);
            bottom.addView(cartHistory, new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        }

        if ("sale".equals(target)) {
            Button checkout = new Button(this);
            checkout.setText("💳 COBRAR");
            checkout.setTextSize(17);
            checkout.setAllCaps(false);
            checkout.setMinHeight(58);
            checkout.setOnClickListener(v -> {
                Intent result = new Intent();
                result.putExtra("action", "checkout");
                result.putExtra("target", target);
                setResult(RESULT_OK, result);
                finish();
            });
            LinearLayout.LayoutParams payLp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            payLp.setMargins(0, 6, 0, 10);
            bottom.addView(checkout, payLp);
        }

        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        controls.setGravity(Gravity.CENTER);

        Button close = new Button(this);
        close.setText("Volver");
        close.setOnClickListener(v -> finish());
        controls.addView(close, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        torchButton = new Button(this);
        torchButton.setText("🔦 Linterna");
        torchButton.setOnClickListener(v -> toggleTorch());
        LinearLayout.LayoutParams torchLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        torchLp.setMargins(10, 0, 0, 0);
        controls.addView(torchButton, torchLp);
        bottom.addView(controls, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        FrameLayout.LayoutParams controlsLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        controlsLp.gravity = Gravity.BOTTOM;
        controlsLp.setMargins(18, 0, 18, 26);
        root.addView(bottom, controlsLp);

        setContentView(root);
        startCamera();
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
        future.addListener(() -> {
            try {
                ProcessCameraProvider provider = future.get();

                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());

                ImageAnalysis analysis = new ImageAnalysis.Builder()
                        .setTargetResolution(new Size(1280, 720))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();

                analysis.setAnalyzer(cameraExecutor, imageProxy -> {
                    if (returning.get()) {
                        imageProxy.close();
                        return;
                    }
                    if (imageProxy.getImage() == null) {
                        imageProxy.close();
                        return;
                    }

                    InputImage image = InputImage.fromMediaImage(
                            imageProxy.getImage(), imageProxy.getImageInfo().getRotationDegrees());

                    scanner.process(image)
                            .addOnSuccessListener(this::handleBarcodes)
                            .addOnCompleteListener(task -> imageProxy.close());
                });

                provider.unbindAll();

                camera = provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis);
                try {
                    activeCameraId = Camera2CameraInfo.from(camera.getCameraInfo()).getCameraId();
                } catch (Exception ignored) {
                    activeCameraId = null;
                }

                boolean hasFlash = camera.getCameraInfo().hasFlashUnit();
                if (torchButton != null) {
                    torchButton.setEnabled(hasFlash);
                    torchButton.setText(hasFlash ? "🔦 Linterna" : "🔦 Sin flash");
                }
                if (hasFlash) {
                    camera.getCameraInfo().getTorchState().observe(this, state -> {
                        torchOn = state != null && state == androidx.camera.core.TorchState.ON;
                        updateTorchButton();
                    });
                }
            } catch (Exception e) {
                Toast.makeText(this, "No se pudo iniciar la cámara.", Toast.LENGTH_LONG).show();
                finish();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void handleBarcodes(@NonNull List<Barcode> barcodes) {
        if (returning.get()) return;
        for (Barcode barcode : barcodes) {
            String value = barcode.getRawValue();
            if (value == null || value.trim().isEmpty()) continue;
            value = value.trim();

            long now = System.currentTimeMillis();
            if (value.equals(lastCode) && now - lastScanAt < 1200L) return;
            lastCode = value;
            lastScanAt = now;

            if ("sale".equals(target)) {
                if (!returning.compareAndSet(false, true)) return;
                MainActivity.handleLiveSaleScan(value);
                mainHandler.postDelayed(() -> returning.set(false), 650);
                return;
            }

            if (!returning.compareAndSet(false, true)) return;
            Intent result = new Intent();
            result.putExtra("code", value);
            result.putExtra("target", target);
            setResult(RESULT_OK, result);
            finish();
            return;
        }
    }

    public static void updateCartSummary(String summary) {
        NativeScannerActivity a = currentScanner;
        if (a == null || a.isFinishing()) return;
        a.runOnUiThread(() -> {
            if (a.cartHistory == null) return;
            String text = summary == null ? "" : summary.trim();
            a.cartHistory.setText(text.isEmpty()
                    ? "🛒 Carrito de compras\nAún no hay productos."
                    : text);
        });
    }

    private void toggleTorch() {
        if (camera == null) {
            Toast.makeText(this, "La cámara todavía está iniciando.", Toast.LENGTH_SHORT).show();
            return;
        }
        if (!camera.getCameraInfo().hasFlashUnit()) {
            Toast.makeText(this, "Esta cámara no tiene flash disponible.", Toast.LENGTH_SHORT).show();
            if (torchButton != null) {
                torchButton.setEnabled(false);
                torchButton.setText("🔦 Sin flash");
            }
            return;
        }

        final boolean wanted = !torchOn;
        if (torchButton != null) {
            torchButton.setEnabled(false);
            torchButton.setText(wanted ? "Encendiendo…" : "Apagando…");
        }

        final ListenableFuture<Void> future = camera.getCameraControl().enableTorch(wanted);
        future.addListener(() -> {
            try {
                future.get();
                torchOn = wanted;
                updateTorchButton();

                // Verificación corta: si el estado no se refleja, intenta Camera2 como respaldo.
                mainHandler.postDelayed(() -> {
                    if (camera == null) return;
                    Integer state = camera.getCameraInfo().getTorchState().getValue();
                    boolean actual = state != null && state == androidx.camera.core.TorchState.ON;
                    if (wanted && !actual) {
                        applyCamera2Torch(true);
                        mainHandler.postDelayed(() -> {
                            Integer retryState = camera != null ? camera.getCameraInfo().getTorchState().getValue() : null;
                            boolean retryOn = retryState != null && retryState == androidx.camera.core.TorchState.ON;
                            if (!retryOn) {
                                applySystemTorch(true);
                            }
                            torchOn = retryOn || isSystemTorchLikelyOn();
                            updateTorchButton();
                            if (!torchOn) {
                                Toast.makeText(this,
                                        "No se pudo encender la linterna. Prueba cerrar y volver a abrir el escáner.",
                                        Toast.LENGTH_LONG).show();
                            }
                        }, 250);
                    } else if (!wanted && actual) {
                        applyCamera2Torch(false);
                        applySystemTorch(false);
                    }
                }, 220);
            } catch (Exception e) {
                // Respaldo para algunos equipos Samsung/Android 16.
                applyCamera2Torch(wanted);
                mainHandler.postDelayed(() -> {
                    if (wanted) applySystemTorch(true);
                    else applySystemTorch(false);
                    Integer state = camera != null ? camera.getCameraInfo().getTorchState().getValue() : null;
                    boolean actual = state != null && state == androidx.camera.core.TorchState.ON;
                    torchOn = wanted && (actual || isSystemTorchLikelyOn());
                    updateTorchButton();
                    if (wanted && !torchOn) {
                        Toast.makeText(this,
                                "No se pudo activar el flash con esta cámara.",
                                Toast.LENGTH_LONG).show();
                    }
                }, 300);
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void updateTorchButton() {
        if (torchButton == null) return;
        if (camera == null || !camera.getCameraInfo().hasFlashUnit()) {
            torchButton.setEnabled(false);
            torchButton.setText("🔦 Sin flash");
            return;
        }
        torchButton.setEnabled(true);
        torchButton.setText(torchOn ? "🔦 Apagar" : "🔦 Linterna");
    }

    private void applyCamera2Torch(boolean on) {
        if (camera == null) return;
        try {
            Camera2CameraControl control = Camera2CameraControl.from(camera.getCameraControl());
            CaptureRequestOptions options = new CaptureRequestOptions.Builder()
                    .setCaptureRequestOption(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON)
                    .setCaptureRequestOption(
                            CaptureRequest.FLASH_MODE,
                            on ? CaptureRequest.FLASH_MODE_TORCH : CaptureRequest.FLASH_MODE_OFF)
                    .build();
            control.setCaptureRequestOptions(options);
        } catch (Exception ignored) {}
    }

    private void applySystemTorch(boolean on) {
        CameraManager manager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
        if (manager == null) return;

        try {
            String id = activeCameraId;
            if (id == null || id.isEmpty()) id = findBackFlashCameraId(manager);
            if (id != null) {
                activeCameraId = id;
                manager.setTorchMode(id, on);
                if (on) torchOn = true;
                else torchOn = false;
            }
        } catch (Exception ignored) {}
    }

    private String findBackFlashCameraId(CameraManager manager) {
        try {
            for (String id : manager.getCameraIdList()) {
                CameraCharacteristics chars = manager.getCameraCharacteristics(id);
                Boolean flash = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                Integer facing = chars.get(CameraCharacteristics.LENS_FACING);
                if (Boolean.TRUE.equals(flash)
                        && facing != null
                        && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    return id;
                }
            }
        } catch (CameraAccessException ignored) {}
        return null;
    }

    private boolean isSystemTorchLikelyOn() {
        return torchOn;
    }

    @Override
    protected void onDestroy() {
        if (currentScanner == this) currentScanner = null;
        try {
            if (torchOn) {
                if (camera != null) camera.getCameraControl().enableTorch(false);
                applyCamera2Torch(false);
                applySystemTorch(false);
            }
        } catch (Exception ignored) {}
        super.onDestroy();
        if (scanner != null) scanner.close();
        if (cameraExecutor != null) cameraExecutor.shutdown();
    }
}
