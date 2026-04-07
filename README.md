# 🎬 Viktoria Gameshow

> **Viktoria** es una aplicación de escritorio para crear y gestionar tu propio programa de concursos, con generación de contenido impulsada por inteligencia artificial (Google Gemini).

---

## 📖 Descripción General

Viktoria Gameshow permite a un presentador o maestro de ceremonias diseñar shows completos con múltiples rondas de juegos, editar el contenido manualmente o generarlo automáticamente con IA, y luego ejecutar las partidas en tiempo real con equipos y marcador.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **UI / Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons |
| **Shell / Desktop** | Electron |
| **Bundler** | Vite |
| **IA** | Google Gemini (`gemini-2.5-pro` / `gemini-2.0-flash`) |
| **Animaciones** | Framer Motion, Lottie, canvas-confetti |
| **Backend de datos** | Firebase (Firestore) |

---

## 🚀 Cómo Correr el Proyecto

### Prerrequisitos

- Node.js **v18+**
- npm
- Una **API Key de Google Gemini** (obtenida desde [Google AI Studio](https://aistudio.google.com/))

### Instalación

```bash
# 1. Clonar el repositorio e instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env y agrega tu API Key:
# VITE_API_KEY=tu_api_key_aquí
```

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia la app en modo desarrollo (React + Electron) |
| `npm run build` | Compila la app para producción |
| `npm start` | Compila e inicia Electron |
| `npm run test` | Corre las pruebas unitarias (Vitest) |
| `npm run test:ui` | Abre el UI de Vitest en el navegador |

---

## 🗂️ Estructura del Proyecto

```
viktoria-gameshow/
├── main.ts                  # Proceso principal de Electron
├── preload.ts               # Script preload (bridge Node ↔ Renderer)
├── src/
│   ├── App.tsx              # Raíz de la app, enrutamiento entre pantallas
│   ├── types.ts             # Tipos TypeScript globales (Game, Show, Team…)
│   ├── screens/
│   │   ├── Dashboard.tsx    # Pantalla principal / menú
│   │   ├── GameLibrary.tsx  # Biblioteca de juegos guardados
│   │   ├── GameCreator.tsx  # Creador / editor de juegos con IA
│   │   ├── GameRouter.tsx   # Enrutador que carga el juego correcto
│   │   ├── ShowManager.tsx  # Gestión de shows (múltiples rondas)
│   │   ├── ShowPlayer.tsx   # Ejecución de un show completo
│   │   ├── editors/         # Editores de contenido por tipo de juego
│   │   └── games/           # Pantallas de gameplay por tipo de juego
│   ├── services/
│   │   ├── geminiService.ts       # Comunicación con Google Gemini AI
│   │   ├── localGameService.ts    # Guardar/cargar juegos en disco local
│   │   └── localShowService.ts    # Guardar/cargar shows en disco local
│   ├── components/          # Componentes reutilizables de UI
│   ├── context/             # Context de React (estado global)
│   ├── hooks/               # Custom hooks
│   └── utils/               # Utilidades (safeJson, etc.)
└── public/                  # Assets estáticos (íconos, sonidos, imágenes)
```

---

## 🎮 Juegos Disponibles

La app incluye **10 tipos de juegos**, cada uno con su propio editor y pantalla de juego:

| Juego | Icono | Descripción |
|---|---|---|
| **Jeopardy** | 🧠 | Grilla de categorías con preguntas de distintos valores ($100–$1000) |
| **Wheel of Fortune** | 🎡 | Ruleta con valores, BANKRUPT y LOSE A TURN; adivinar letras de una frase |
| **Price Is Right** | 💰 | Adivinar el precio de un producto sin pasarse |
| **Pyramid** | 🔺 | 10 niveles de preguntas de opción múltiple (A, B, C) de dificultad creciente |
| **Family Feud** | 👪 | Nombrar las respuestas más populares a preguntas de encuesta |
| **Definitions** | 📚 | Adivinar la palabra dada su definición, con pistas letra por letra |
| **Hangman** | 🪢 | El ahorcado clásico: adivinar letras de una frase escondida |
| **Rosco** | 🎡 | Una pregunta por cada letra del abecedario; posibilidad de pasar y volver |
| **Bingo** | 🔢 | Bingo de palabras o números con tarjetas 5×5 para cada jugador |
| **Lottery** | 🎟️ | Sorteo de números; se verifican cuántos coinciden con el boleto de cada jugador |

---

## 🤖 Generación de Contenido con IA

Desde el **GameCreator**, el presentador puede generar el contenido de cualquier juego automáticamente:

1. Se elige el tipo de juego y el **tema** (ej. "Historia de América Latina", "Cultura pop 90s")
2. Se selecciona el **idioma** (Español / English / Français)
3. La app llama a Google Gemini y rellena automáticamente todas las preguntas, respuestas y puntajes
4. El contenido se puede revisar y editar manualmente antes de guardar

### Modelo de respuesta estandarizado

Todas las llamadas a la IA devuelven un objeto `ServiceResponse<T>`:

```typescript
interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}
```

---

## 🕹️ Modos de Juego

### Show Completo
El **ShowManager** permite armar un show con múltiples rondas de juegos distintos. El **ShowPlayer** ejecuta cada ronda en secuencia.

### Quick Play ⚡
Permite jugar un único juego guardado de la biblioteca de forma inmediata:
1. El presentador selecciona un juego desde `GameLibrary` y pulsa **Quick Play**
2. Un modal solicita el número de equipos (2–4)
3. El `QuickPlayWrapper` gestiona el marcador global y permite al presentador sumar/restar puntos manualmente

---

## 💾 Almacenamiento Local

Los juegos y shows se guardan como archivos `.json` en el sistema de archivos local del usuario a través del proceso principal de Electron. La API es:

- `localGameService`: `saveGame`, `loadGame`, `loadAllGames`, `deleteGame`
- `localShowService`: `saveShow`, `loadAllShows`, `deleteShow`

---

## ⚠️ Notas de Seguridad

> La API Key de Gemini actualmente se usa desde el cliente via `VITE_API_KEY`. **Para producción, se recomienda moverla a un backend seguro** (Cloud Functions, Express, etc.) para evitar exposición de credenciales. Ver [`TODO.md`](./TODO.md).

---

## 🧪 Testing

Ver [`TESTING.md`](./TESTING.md) para instrucciones de configuración de **Vitest** y cómo correr las pruebas unitarias existentes (actualmente cubren `localGameService`).

---

## 📋 Pendientes

Ver [`TODO.md`](./TODO.md) para la lista de mejoras críticas pendientes (seguridad de API Key, refactorización del servicio de IA).
