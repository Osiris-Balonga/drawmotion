# Changelog

## 1.0.0-rc.1 — 2026-08-27 (candidate locale, non publiée)

### Fonctionnalités

- Dessin 2D à la webcam : index pour viser, pincement pour tracer, poing pour gommer.
- Commandes contextuelles ouvertes avec le signe paix ; réglages synchronisés avec le dock.
- Modes Libre, Stabilisé et Formes ; retour possible au tracé original après régularisation.
- Couleurs prédéfinies et personnalisées HEX/RGB, épaisseur du stylo et de la gomme, traits continus, tirets et pointillés.
- Annuler/rétablir, confirmation d'effacement, navigation et zoom de toile, export PNG.
- Interface flottante, tutoriel illustré en cinq missions, état de première visite mémorisé localement.
- Modèle et runtime MediaPipe servis localement ; inférence dans un Worker, sans envoi vidéo à un serveur.

### Fiabilité et préparation de livraison

- File d'inférence bornée et abandon des images dépassées pour éviter l'accumulation de retard.
- Reprise du suivi sans raccord parasite après une perte de main ; feedback lisible sous la caméra.
- Réglages adaptatifs, navigation clavier, réduction des animations et tests d'accessibilité ciblés.
- CSP et en-têtes de sécurité, vérification des assets et budgets de bundle, audit des dépendances.
- Tests séparés par catégorie et parcours navigateur ; préparation de la QA et du workflow de release.
- Taille de gomme sélectionnée respectée lors de l'effacement au poing, y compris sous 40 pixels.
- Workspace séparé en composition, gestes, navigation et tutoriel ; anciennes interfaces inutilisées retirées.
- Licence MIT, notices tierces incluses dans le build et guide de contribution.

### Limites connues

- La qualité et la latence dépendent de la webcam, de l'éclairage et du matériel ; QA physique finale encore à faire.
- Chrome et Edge Windows sont les cibles de validation initiales. Tablette réelle, Safari et Firefox ne sont pas certifiés par les tests desktop.
- Les contrôles fonctionnent au clavier et à la souris, mais le dessin libre nécessite actuellement une main détectée.
- Pas de sauvegarde de document ni de collaboration ; exporter avant de fermer la page.
- Le PNG capture la zone visible de la toile : dézoomer/recentrer avant d'exporter pour inclure les traits hors champ.
- Démo publique et publication open source encore en attente.

Les résultats automatiques datés du [lot 10](./docs/qa/lot10-local.md) ne
remplacent pas la [QA finale](./docs/qa/v1.0.0.md).
