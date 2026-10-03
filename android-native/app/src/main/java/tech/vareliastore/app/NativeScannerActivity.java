package tech.vareliastore.app;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
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
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class NativeScannerActivity extends AppCompatActivity {
    private PreviewView previewView;
    private Camera camera;
    private BarcodeScanner scanner;
    private ExecutorService cameraExecutor;
    private final AtomicBoolean returning = new AtomicBoolean(false);
    private boolean torchOn = false;
    private String target = "sale";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        target = getIntent().getStringExtra("target");
        if (target == null || target.isEmpty()) target = "sale";

        cameraExecutor = Executors.newSingleThreadExecutor();
        scanner = BarcodeScanning.getClient();

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

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

        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        controls.setGravity(Gravity.CENTER);
        controls.setPadding(18, 12, 18, 24);

        Button close = new Button(this);
        close.setText("Cerrar");
        close.setOnClickListener(v -> finish());
        controls.addView(close, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button torch = new Button(this);
        torch.setText("🔦 Linterna");
        torch.setOnClickListener(v -> toggleTorch(torch));
        LinearLayout.LayoutParams torchLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        torchLp.setMargins(12, 0, 0, 0);
        controls.addView(torch, torchLp);

        FrameLayout.LayoutParams controlsLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        controlsLp.gravity = Gravity.BOTTOM;
        controlsLp.setMargins(18, 0, 18, 24);
        root.addView(controls, controlsLp);

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
                camera = provider.bindToLifecycle(
                        this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis);
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
            if (!returning.compareAndSet(false, true)) return;
            Intent result = new Intent();
            result.putExtra("code", value.trim());
            result.putExtra("target", target);
            setResult(RESULT_OK, result);
            finish();
            return;
        }
    }

    private void toggleTorch(Button button) {
        if (camera == null) return;
        if (!camera.getCameraInfo().hasFlashUnit()) {
            Toast.makeText(this, "Este celular no tiene flash disponible para la cámara.", Toast.LENGTH_SHORT).show();
            return;
        }
        torchOn = !torchOn;
        camera.getCameraControl().enableTorch(torchOn);
        button.setText(torchOn ? "🔦 Apagar" : "🔦 Linterna");
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (scanner != null) scanner.close();
        if (cameraExecutor != null) cameraExecutor.shutdown();
    }
}
