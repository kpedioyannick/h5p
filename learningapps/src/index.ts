// Point d'entrée principal du serveur Express
// assistant-learn-node - API pour générer des activités LearningApps

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRITICAL: Load .env BEFORE importing routes that use environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Debug: Log if OPENAI_API_KEY is loaded
console.log('🔑 OPENAI_API_KEY loaded:', process.env.OPENAI_API_KEY ? 'YES (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'NO');
console.log('📁 .env path:', path.resolve(__dirname, '../../.env'));

// Import routes AFTER dotenv.config()
import express from 'express';
import contentRoutes from './routes/content.js';
import modulesRoutes from './routes/modules.js';
import h5pRoutes from './routes/h5p.js';
import planningRoutes from './routes/planning.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/content', contentRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/h5p', h5pRoutes);
app.use('/api/planning', planningRoutes);

// Route /view/:slug/:id removed (handled by external h5p server)

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'assistant-learn-node',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check API key
app.get('/debug/apikey', (req, res) => {
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    res.json({
      loaded: true,
      length: key.length,
      prefix: key.substring(0, 10),
      suffix: key.substring(key.length - 10)
    });
  } else {
    res.json({ loaded: false });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'assistant-learn-node',
    description: 'API pour générer des activités LearningApps',
    version: '2.0.0',
    endpoints: {
      health: 'GET /health',
      modules: {
        list: 'GET /api/modules',
        learningapps: 'GET /api/modules/learningapps'
      },
      content: {
        createLearningApps: 'POST /api/content/learningapps'
      }
    },
    documentation: {
      createContent: {
        method: 'POST',
        body: {
          module: 'string - Nom du module (nom du fichier scénario)',
          title: 'string - Titre de l\'activité',
          params: 'object - Paramètres spécifiques au module'
        }
      },
      workflow: {
        learningapps: {
          step1: 'Enregistrer un scénario avec Playwright Codegen',
          step2: 'Adapter le code pour accepter des paramètres',
          step3: 'Sauvegarder dans src/scenarios/learningapps/[module].ts',
          step4: 'Appeler POST /api/content/learningapps avec les paramètres'
        }
      }
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 assistant-learn-node v2.0.0                             ║
║   API pour générer des activités LearningApps                 ║
║                                                              ║
║   Server running at: http://localhost:${PORT}                   ║
║                                                              ║
║   Endpoints:                                                 ║
║   • GET  /api/modules           - List all providers         ║
║   • GET  /api/modules/learningapps - List LearningApps      ║
║   • POST /api/content/learningapps - Create LearningApps    ║
║                                                              ║
║   🎬 Workflow:                                                ║
║   LearningApps: Scénarios Playwright                          ║
║                                                              ║
║   🖥️  Browser mode: HEADED (visible)                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

export default app;

