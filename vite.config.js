import { defineConfig } from 'vite'

// Vite configuration for both dev (server) and prod preview (vite preview)
// This fixes Railway "Blocked request. This host is not allowed" by allowing the service hostname.
export default defineConfig({
  server: {
    host: true, // listen on all addresses in dev
    port: 5173,
  },
  preview: {
    // Bind to 0.0.0.0 for Railway and respect PORT when using `npm run start`
    host: '0.0.0.0',
    port: process.env.PORT ? Number(process.env.PORT) : 4173,
    // Allow Railway preview hostnames
    // If you add a custom domain, add it here as well.
    allowedHosts: [
      'real-talentsync-job-board-production.up.railway.app',
      // Allow any *.up.railway.app if your service name changes in environments
      /.+\.up\.railway\.app$/,
    ],
  },
})
