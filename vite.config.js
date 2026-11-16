import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Local development only: serves the /api/* endpoints the same way the Netlify Functions do,
 * using GEMINI_API_KEY from .env.local (never bundled into the app).
 */
const DEV_ROUTES = {
  '/api/translate': ['/server/translate.js', 'handleTranslateRequest'],
  '/api/qa-chat': ['/server/qaChat.js', 'handleQaChatRequest'],
  '/api/settings': ['/server/settings.js', 'handleSettingsRequest'],
  '/api/murli': ['/server/murli.js', 'handleMurliRequest'],
};

function serverApiForDev(env) {
  return {
    name: 'gyan-seedhi-api-dev',
    configureServer(server) {
      for (const [route, [file, handlerName]] of Object.entries(DEV_ROUTES)) {
        server.middlewares.use(route, async (req, res) => {
          try {
            const chunks = [];
            for await (const c of req) chunks.push(c);
            const request = new Request(`http://localhost${route}`, {
              method: req.method,
              headers: { 'content-type': 'application/json' },
              body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
            });
            const mod = await server.ssrLoadModule(file);
            // key from the Settings tab (stored in .data/), else GEMINI_API_KEY from .env.local
            const { getAiKey } = await server.ssrLoadModule('/server/secrets.js');
            const envKey = env.GEMINI_API_KEY || '';
            if (env.GEMINI_MODEL) process.env.GEMINI_MODEL = env.GEMINI_MODEL;
            const apiKey = await getAiKey({ dev: true, envKey });
            const response = await mod[handlerName](request, { apiKey, envKey, dev: true });
            res.statusCode = response.status;
            res.setHeader('content-type', 'application/json');
            res.end(await response.text());
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'server_error', message: String(err?.message || err) }));
          }
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // '' prefix loads every variable from .env files; only used server-side here
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  return {
    plugins: [react(), serverApiForDev(env)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      rollupOptions: {
        // Firebase and React change rarely, so separate files stay cached between app updates
        output: {
          manualChunks: {
            firebase: ['firebase/app', 'firebase/firestore'],
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
    // host: true makes the dev server reachable from phones on the same Wi-Fi
    server: { port: 5173, host: true },
    preview: { port: 4173, host: true },
  };
});
