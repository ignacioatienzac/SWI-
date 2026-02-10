# 🔒 Guía de Configuración Firebase Functions
## Protección segura de tu API Key de Gemini

---

## ✅ Lo que ya está hecho (código)
- ✅ Función serverless creada en `functions/index.js`
- ✅ Cliente actualizado en `services/geminiService.ts`
- ✅ Tu API Key eliminada del código frontend

---

## 📋 Lo que TÚ debes hacer (paso a paso)

### ~~**PASO 1: Instalar Firebase CLI**~~ ✅ YA HECHO

✅ Firebase CLI ya está instalado localmente (versión 15.4.0)

**Importante:** Como está instalado localmente, debes usar `npx firebase` en lugar de solo `firebase`.

---

### **PASO 1: Iniciar sesión en Firebase** (2 min)

Copia y pega esto en tu Terminal:

```bash
cd "/Users/ignacio/Documents/Spanish with Ignacio/SWI-" && npx firebase login
```

Se abrirá tu navegador. Inicia sesión con tu cuenta de Google.

---

### **PASO 2: Crear proyecto en Firebase Console** (3 min)

1. Ve a: https://console.firebase.google.com/
2. Haz clic en **"Agregar proyecto"**
3. Nombre del proyecto: `spanish-with-ignacio` (o el que quieras)
4. Desactiva Google Analytics (no lo necesitas)
5. Haz clic en **"Crear proyecto"**

---

### **PASO 3: Conectar tu código con Firebase** (2 min)

Copia y pega esto en tu Terminal:

```bash
cd "/Users/ignacio/Documents/Spanish with Ignacio/SWI-" && npx firebase init
```

Te preguntará:

**¿Qué quieres configurar?**
- Selecciona (con ESPACIO): `Functions` y `Hosting`
- Presiona ENTER

**¿Usar un proyecto existente o crear uno nuevo?**
- Selecciona: `Use an existing project`
- Elige el proyecto que creaste: `spanish-with-ignacio`

**¿Qué lenguaje?**
- Selecciona: `JavaScript`

**¿Usar ESLint?**
- No (presiona `N`)

**¿Instalar dependencias con npm?**
- Sí (presiona `Y`)

**¿Qué carpeta para hosting?**
- Escribe: `dist`

**¿Configurar como SPA?**
- Sí (presiona `Y`)

---

### **PASO 4: 🔒 Configurar tu API Key de forma SEGURA** (2 min)

Copia y pega esto en tu Terminal (reemplaza con tu API Key real):

```bash
cd "/Users/ignacio/Documents/Spanish with Ignacio/SWI-" && npx firebase functions:config:set gemini.key="TU_API_KEY_AQUI"
```

⚠️ **IMPORTANTE**: Reemplaza `TU_API_KEY_AQUI` con tu API Key real de Gemini.

Ejemplo:
```bash
cd "/Users/ignacio/Documents/Spanish with Ignacio/SWI-" && npx firebase functions:config:set gemini.key="AIzaSyBEzEiqx-jmezWTvfqmIM6Xq15wBj__sAs"
```

Verifica que se guardó:

```bash
cd "/Users/ignacio/Documents/Spanish with Ignacio/SWI-" && npx firebase functions:config:get
```

Deberías ver:
```json
{
  "gemini": {
    "key": "AIza..."
  }
}
```

---

### **PASO 5: Instalar dependencias de Firebase Functions** (2 min)

Copia y pega esto en tu Terminal:

```bash
cd "/Users/ignacio/Documents/Spanish with Ignacio/SWI-/functions" && npm install && cd ..
```

---

### **PASO 6: Desplegar tu función a la nube** (3 min)

Copia y pega esto en tu Terminal:

```bash
cd "/Users/ignacio/Documents/Spanish with Ignacio/SWI-" && npx firebase deploy --only functions
```text

Espera unos 2-3 minutos. Al terminar verás algo como:

```text
✔  Deploy complete!

Function URL (hablarConPandaSeguro):
https://us-central1-spanish-with-ignacio.cloudfunctions.net/hablarConPandaSeguro
```

---

### **PASO 7: Configurar Firebase en tu app web** (2 min)

1. Ve a Firebase Console: https://console.firebase.google.com/
2. Selecciona tu proyecto
3. Haz clic en el ícono **Web** (`</>`)
4. Registra tu app: `Spanish with Ignacio Web`
5. Copia la configuración que te da

Deberás crear un archivo `src/firebase.ts` con algo como:

```typescript
import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIza...",  // Este es diferente, es para Firebase
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "spanish-with-ignacio",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

export const app = initializeApp(firebaseConfig);
export const functions = getFunctions(app);
```

---

### **PASO 8: Instalar Firebase SDK en tu proyecto** (1 min)

Copia y pega esto en tu Terminal:

```bash
cd "/Users/ignacio/Documents/Spanish with Ignacio/SWI-" && npm install firebase
```

---

## 🎉 ¡LISTO! Tu API Key está ahora PROTEGIDA

### ✅ Beneficios conseguidos:
- 🔒 Tu API Key NO está en el código del navegador
- 🔒 Nadie puede robarla inspeccionando el código
- 🔒 Solo tu servidor puede usarla
- 🆓 Completamente GRATIS (hasta 2M peticiones/mes)

---

## 🧪 Probar que funciona

En tu código, usa `hablarConPanda` como siempre:

```typescript
import { hablarConPanda } from './services/geminiService';

const respuesta = await hablarConPanda(
  "¿Cómo se dice 'hello' en español?",
  "Guía General",
  null
);

console.log(respuesta); // Debe mostrar la respuesta del Panda 🐾
```

---

## ❓ Preguntas Frecuentes

**P: ¿Debo hacer esto cada vez que edito mi código?**
R: No. Solo cuando cambies algo en `functions/index.js` debes hacer `npx firebase deploy --only functions`.

**P: ¿Cuánto cuesta Firebase Functions?**
R: GRATIS hasta 2 millones de invocaciones al mes. Más que suficiente.

**P: ¿Puedo ver los logs de errores?**
R: Sí, con `npx firebase functions:log`

**P: ¿Puedo probar localmente antes de desplegar?**
R: Sí, con `npm run serve` dentro de la carpeta `functions/`

---

## 📞 Si algo falla

1. Revisa los logs: `npx firebase functions:log`
2. Verifica la configuración: `npx firebase functions:config:get`
3. Asegúrate de que desplegaste: `npx firebase deploy --only functions`

---

**¡Todo listo para tener tu Panda 🐾 funcionando de forma SEGURA!**
