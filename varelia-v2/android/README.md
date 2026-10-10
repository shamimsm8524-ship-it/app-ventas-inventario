# Varelia 2.0 Android (prototipo)

Este proyecto Android envuelve la interfaz web existente en un WebView. NO es la aplicación final, ni una APK lista para producción. El archivo `web/config.js` todavía necesita las credenciales públicas de un proyecto Supabase NUEVO. Google OAuth en WebView requiere una implementación externa compatible antes de funcionar. No usar para registrar ventas reales.

Para compilar localmente con Android SDK y Gradle 8.9: copiar `varelia-v2/web/*` a `android/app/src/main/assets/`, ejecutar `gradle assembleDebug` desde `android/`. El APK de desarrollo queda en `app/build/outputs/apk/debug/`.
