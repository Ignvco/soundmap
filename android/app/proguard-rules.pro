# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ─────────────────────────────────────────────────────────────────────────────
# SoundMap — reglas necesarias si activás `minifyEnabled true`.
#
# Capacitor descubre y instancia sus plugins por reflexión a partir de la
# anotación @CapacitorPlugin. R8 no ve esas referencias, así que sin estas
# reglas los elimina y la app crashea al arrancar con ClassNotFoundException.
# ─────────────────────────────────────────────────────────────────────────────

# Núcleo de Capacitor y todos los plugins (incluye @capacitor/camera y haptics)
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public <methods>;
}

# Plugins Cordova puenteados por Capacitor
-keep class org.apache.cordova.** { *; }

# Interfaces JavaScript del WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Anotaciones (Capacitor las lee en runtime)
-keepattributes *Annotation*, InnerClasses, Signature, Exceptions

# Stack traces legibles en crashes de producción
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
