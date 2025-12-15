# TODO - Améliorations restantes pour le système H5P

## 🔴 Priorité Haute

### 1. ✅ Gérer les champs de type "library" dans semantics.json
- **Status** : IMPLÉMENTÉ
- **Détails** : `generateContentJson()` gère maintenant les champs de type "library" et génère récursivement les content.json des sous-modules
- **Format supporté** : 
  - `{ library: "H5P.AdvancedText 1.1", params: {...} }`
  - Format automatique depuis les options du champ semantics

### 2. Copier les dépendances depuis library.json
- **Problème** : Le système génère un library.json basique au lieu d'utiliser celui téléchargé avec ses dépendances
- **Action** : Utiliser le library.json téléchargé tel quel (il contient déjà preloadedDependencies, preloadedJs, preloadedCss)

### 3. Tester la génération complète
- **Action** : Créer un script de test pour générer un contenu H5P simple (Dialogcards, Summary) et vérifier les fichiers créés

## 🟡 Priorité Moyenne

### 4. Gérer les fichiers JS/CSS manquants
- **Problème** : Les fichiers JS/CSS référencés dans library.json n'existent pas encore
- **Action** : Soit les télécharger depuis le serveur source, soit les créer vides, soit les ignorer si H5P les génère automatiquement

### 5. Améliorer la génération de content.json
- **Types manquants** : Gérer tous les types de champs semantics (image, video, audio, file, etc.)
- **Widgets spéciaux** : Gérer les widgets comme "showWhen", "librarySelector", etc.

### 6. Gérer les sous-modules récursivement
- **Problème** : Quand un module contient d'autres modules (comme InteractiveBook), il faut générer leurs content.json aussi
- **Action** : Créer une fonction récursive pour générer tous les sous-modules

## 🟢 Priorité Basse

### 7. Configuration du serveur H5P
- **Action** : Documenter comment configurer H5P_CONTENT_PATH et H5P_LIBRARIES_PATH
- **Action** : Vérifier que les chemins sont corrects pour votre installation H5P

### 8. Gestion des erreurs améliorée
- **Action** : Ajouter plus de validation et de messages d'erreur explicites
- **Action** : Logger les étapes de génération pour le débogage

### 9. Documentation
- **Action** : Documenter le format des paramètres pour chaque module
- **Action** : Créer des exemples d'utilisation pour chaque type de module

### 10. Optimisations
- **Action** : Mettre en cache les semantics.json et library.json pour éviter de les relire à chaque fois
- **Action** : Valider les paramètres avant de générer les fichiers

