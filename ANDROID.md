# Instalar SoundMap en tu Android

**Yo no pude generar el APK**: este entorno no tiene el SDK de Android y el
proxy bloquea `dl.google.com`, así que Gradle no puede bajar sus dependencias.
Lo que sí hice fue dejar el proyecto Android listo y arreglar un bloqueador
(ver "Qué arreglé" abajo). Vos lo compilás en tu Mac.

---

## Camino corto — probar en tu teléfono (5 min)

Es un APK de **debug**: se firma solo con la keystore de debug, se instala sin
problemas en tu propio dispositivo. **No sirve para Play Store**, pero para
probar es exactamente lo que querés.

### 1. Requisitos (una sola vez)

- **Android Studio** — https://developer.android.com/studio
  Al abrirlo por primera vez, dejá que instale el SDK. Necesitás **API 36**
  (`compileSdk`/`targetSdk` del proyecto) y **JDK 17 o superior**
  (Android Studio trae uno embebido, no hace falta instalarlo aparte).
- **Tu teléfono en modo desarrollador**:
  Ajustes → Información del teléfono → tocá **7 veces** "Número de compilación"
  → volvé a Ajustes → Opciones de desarrollador → activá **Depuración por USB**.

### 2. Compilar

```bash
npm install
npm run build          # genera dist/
npx cap sync android   # copia dist/ al proyecto Android + sincroniza plugins
npx cap open android   # abre Android Studio
```

En Android Studio: esperá a que termine el "Gradle sync" (la primera vez tarda
varios minutos y baja bastante), conectá el teléfono por USB, elegilo en el
selector de dispositivos arriba y tocá **Run ▶**.

### Alternativa sin abrir Android Studio

Si ya tenés el SDK instalado y el teléfono conectado:

```bash
npm run build && npx cap sync android
cd android
./gradlew assembleDebug
# APK en: android/app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

O pasate el `app-debug.apk` al teléfono por cable/Drive y abrilo (vas a tener
que permitir "instalar apps de fuentes desconocidas").

---

## Camino largo — APK firmado para Play Store

**Acá había un bloqueador**: el repo trae
`android/app/keystore/soundmap-release-key.jks`, pero **nada la conectaba al
build**. `./gradlew assembleRelease` producía un APK **sin firmar**, que Android
se niega a instalar. Ya lo conecté.

```bash
cp android/keystore.properties.example android/keystore.properties
```

Completá las tres credenciales de tu keystore:

```properties
storePassword=...
keyAlias=...
keyPassword=...
```

Después:

```bash
npm run build && npx cap sync android
cd android
./gradlew assembleRelease   # APK
./gradlew bundleRelease     # AAB — es lo que pide Play Store
```

`keystore.properties` y los `.jks` ya están en `.gitignore`.

> **Si no te acordás la contraseña de esa keystore**, no hay forma de
> recuperarla. Y si esa app ya está publicada en Play con esa firma, tampoco
> podés reemplazarla — salvo que tengas Play App Signing activado. Verificalo
> antes de necesitarlo con urgencia.

### Antes de publicar

- `versionCode` y `versionName` están en `1` / `"1.0"`
  (`android/app/build.gradle`). Play rechaza subir dos veces el mismo
  `versionCode`.
- `minifyEnabled` está en **false** a propósito — ver abajo.

---

## Qué arreglé en el lado Android

1. **La keystore no estaba conectada al build.** Los releases salían sin firmar.
   Ahora `app/build.gradle` lee las credenciales de `keystore.properties` (o de
   variables de entorno en CI) y firma. Si el archivo no existe, el bloque se
   omite y los builds de debug siguen andando sin configurar nada.

2. **El service worker no se registra dentro de la app nativa.** En Android el
   bundle ya viene empaquetado en el APK y lo sirve el bridge local, así que el
   SW no aportaba offline — sólo una capa de caché capaz de servir assets viejos
   después de actualizar desde Play. Y el toast "hay una nueva versión" no tiene
   sentido ahí, porque las actualizaciones llegan por la tienda. Ahora se salta
   con `Capacitor.isNativePlatform()`.

3. **Reglas de ProGuard para Capacitor**, escritas y listas en
   `app/proguard-rules.pro`. **`minifyEnabled` lo dejé en `false`**: Capacitor
   carga sus plugins por reflexión (`@CapacitorPlugin`), así que activar R8 sin
   las reglas correctas genera una app que compila pero crashea al arrancar.
   No pude probarlo en un dispositivo, y no iba a activarte algo que puede
   dejarte la app rota sin que yo lo vea. Si querés reducir el APK: poné
   `minifyEnabled true` y **probá el APK de release en un teléfono real** — el
   de debug no ejecuta R8, así que no sirve para validar esto.

---

## Lo que ya estaba bien

- Permisos correctos en el manifest: `RECORD_AUDIO` (medidor SPL, RT60, kiosk),
  `CAMERA` (escaneo AR), ambos declarados como features **opcionales** para que
  la app instale igual en dispositivos sin ellos.
- `appId` consistente: `com.levelproaudio.soundmap` en Capacitor, Gradle y
  manifest.
- Sin bloqueo de orientación, así que el modo Kiosk apaisado funciona.
- Plugins de Capacitor sincronizados: camera y haptics.

---

## Advertencia de seguridad

`android/app/keystore/soundmap-release-key.jks` **está dentro del repo**. Si ese
repositorio se hace público o se filtra, cualquiera puede firmar actualizaciones
que Android va a aceptar como tuyas. Sacala del repo y guardala en un gestor de
contraseñas o almacenamiento cifrado. Ya la agregué al `.gitignore`, pero eso
sólo evita futuros commits: si ya está en el historial de git, sigue ahí.
