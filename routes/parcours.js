const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

const CONTENT_DIR = path.join(__dirname, '../content');

router.get('/', async (req, res) => {
    try {
        const modulesParam = req.query.modules;

        if (!modulesParam || typeof modulesParam !== 'string') {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Erreur - Parcours</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                        .error { color: #d32f2f; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Erreur</h1>
                    <p>Le paramètre 'modules' est requis.</p>
                    <p>Format attendu: <code>/parcours?modules=h5p:ID1,learningapps:ID2,h5p:ID3</code></p>
                </body>
                </html>
            `);
        }

        // Parse modules parameter: "h5p:ID1,learningapps:ID2,h5p:ID3"
        const modulesList = modulesParam.split(',').map(item => {
            const [type, id] = item.trim().split(':');
            return { type, id };
        });

        // Validate modules
        const validModules = modulesList.filter(m =>
            m.type && m.id && (m.type === 'h5p' || m.type === 'learningapps')
        );

        if (validModules.length === 0) {
            return res.status(400).send(`
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Erreur - Parcours</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                        .error { color: #d32f2f; }
                    </style>
                </head>
                <body>
                    <h1 class="error">Erreur</h1>
                    <p>Aucun module valide trouvé.</p>
                    <p>Format attendu: <code>type:id</code> où type est 'h5p' ou 'learningapps'</p>
                </body>
                </html>
            `);
        }

        // Generate slides HTML
        const slidesHTML = validModules.map((module, index) => {
            let embedHTML = '';

            if (module.type === 'h5p') {
                // H5P module - embed using external server
                const h5pBaseUrl = process.env.H5P_BASE_URL || 'http://localhost:8080';
                let h5pUrl = `${h5pBaseUrl}/view/unknown/${module.id}`;

                // Try to resolve library slug from content
                try {
                    const contentDir = path.join(CONTENT_DIR, module.id);
                    if (fs.existsSync(path.join(contentDir, 'h5p.json'))) {
                        const h5pJson = fs.readJsonSync(path.join(contentDir, 'h5p.json'));
                        const mainLib = h5pJson.mainLibrary;

                        // Read registry
                        const registryPath = path.join(__dirname, '../libraryRegistry.json');
                        let slug = mainLib.toLowerCase().replace('.', '-'); // Fallback

                        if (fs.existsSync(registryPath)) {
                            const registry = fs.readJsonSync(registryPath);
                            if (registry[mainLib] && registry[mainLib].shortName) {
                                slug = registry[mainLib].shortName;
                            }
                        }
                        h5pUrl = `${h5pBaseUrl}/view/${slug}/${module.id}`;
                    }
                } catch (e) {
                    console.error('Error resolving H5P slug:', e);
                }

                embedHTML = `
                    <div class="module-container">
                        <iframe src="${h5pUrl}" 
                                frameborder="0" 
                                allowfullscreen
                                class="h5p-iframe">
                        </iframe>
                    </div>
                `;
            } else if (module.type === 'learningapps') {
                // LearningApps module - embed using LearningApps URL
                const learningAppsUrl = `https://learningapps.org/watch?v=${module.id}`;
                embedHTML = `
                    <div class="module-container">
                        <iframe src="${learningAppsUrl}" 
                                frameborder="0" 
                                allowfullscreen
                                class="learningapps-iframe">
                        </iframe>
                    </div>
                `;
            }

            return `<section data-background-color="#f0f2f5">${embedHTML}</section>`;
        }).join('\n');

        // Generate complete HTML page with Reveal.js
        const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Parcours d'apprentissage</title>
    
    <!-- Reveal.js CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.2.1/reveal.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.2.1/theme/dracula.min.css">
    
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background-color: #f0f2f5;
        }
        
        .reveal .slides {
            text-align: center;
        }

        /* Full screen module container */
        .module-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
        }
        
        /* Responsive iframe */
        .module-container iframe {
            width: 95%;
            height: 90%;
            max-width: 1200px;
            border: none;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            background: white;
        }

        /* Mobile adjustments */
        @media (max-width: 768px) {
            .module-container iframe {
                width: 100%;
                height: 100%;
                border-radius: 0;
            }
        }
        
        /* Reveal controls customization */
        .reveal .controls {
            color: #667eea;
        }
        
        .reveal .progress {
            height: 6px;
        }
        
        .reveal .progress span {
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }
    </style>
</head>
<body>
    <div class="reveal">
        <div class="slides">
            ${slidesHTML}
        </div>
    </div>

    <!-- Reveal.js JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/5.2.1/reveal.min.js"></script>
    
    <script>
        // Initialize Reveal.js
        Reveal.initialize({
            controls: true,
            progress: true,
            center: true,
            hash: true,
            transition: 'convex', // More modern transition
            
            // Mobile settings
            width: "100%",
            height: "100%",
            margin: 0,
            minScale: 1,
            maxScale: 1,
            
            // Disable default slide number to keep it clean
            slideNumber: false,
        });
        
        console.log('Parcours initialized with ${validModules.length} modules');
    </script>
</body>
</html>
        `;

        res.send(html);

    } catch (err) {
        console.error('Parcours Error:', err);
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Erreur - Parcours</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                    .error { color: #d32f2f; }
                </style>
            </head>
            <body>
                <h1 class="error">Erreur serveur</h1>
                <p>${err.message}</p>
            </body>
            </html>
        `);
    }
});

module.exports = router;
