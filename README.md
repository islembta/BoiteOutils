# BoiteOutils - Gestion de Projets

BoiteOutils est une application web de gestion de projets qui permet la création, la modification et le calcul de plannings via la méthode PERT. L'application inclut une vue Gantt, le suivi de tâches et chemins critiques, ainsi qu'un système d'import/export des projets.

## Fonctionnalités

- Création et gestion de plusieurs projets
- Vue du projet avec liste de tâches et diagramme de Gantt avec chemins critiques
- Calcul des durées estimées via l'approche probabiliste PERT (Optimiste, Réaliste, Pessimiste)
- Import manuel des projets
- Sauvegarde locale intégrée au navigateur

## Installation

Le projet utilise Vite et React. Pour l'installer et le faire tourner en local :

1. Assurez-vous d'avoir Node.js installé.
2. Clonez l'archive de code ou téléchargez-la en local.
3. Installez les dépendances via `npm` (ou `yarn`) :
   ```bash
   npm install
   ```

## Démarrage (Développement)

Pour lancer le serveur de développement :

```bash
npm run dev
```
L'URL locale s'affichera dans le terminal (par exemple http://localhost:5173).

## Compilation (Production)

Pour construire l'application finale optimisée :

```bash
npm run build
```

Vous pouvez ensuite utiliser `npm run preview` pour tester la version compilée en local, ou héberger le dossier `dist/` sur la solution de votre choix (Vercel, Netlify, hébergement classique...).
