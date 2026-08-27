# Compatibilité, confidentialité et dépannage

## Périmètre

DrawMotion est une application cliente de dessin gestuel pour ordinateur et
tablette. Le stylo/gomme gestuel nécessite une caméra et une main détectée.
Les réglages, commandes, historique, export, zoom et déplacement de la toile
restent utilisables à la souris et au clavier. Il n'existe pas encore de mode
complet de dessin libre sans caméra.

Chrome et Edge récents sont les cibles de la démo. La caméra nécessite HTTPS,
ou `localhost`/`127.0.0.1` en développement. Une URL HTTP sur le réseau local
ne suffit pas. Le navigateur doit fournir Worker, WebAssembly,
createImageBitmap, Canvas et getUserMedia. Le suivi essaie le GPU puis le CPU
si l'initialisation GPU échoue ; cela ne garantit pas une vitesse suffisante
sur tous les appareils.

| Contexte                         | Validation disponible                                                               | Limites                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Chromium automatisé, Windows     | Parcours complets, modèle/WASM réels sur vidéo factice, export, CSP, clavier et axe | Pas une vraie main ni une mesure de précision                  |
| Chrome / Edge installés          | Smoke tests exécutés avec `E2E_BROWSER_CHANNEL`                                     | QA webcam physique avant diffusion                             |
| Tablette 782×600 / 768×1024      | Disposition et réglages dans un navigateur automatisé                               | Pas une validation physique iPad/Android                       |
| Zoom 200 %                       | Fenêtres CSS 720×450 / 640×400 (équivalents de 1440×900 / 1280×800)                 | Zoom natif, clavier virtuel et tactile à vérifier manuellement |
| Safari / Firefox                 | Pas de validation effectuée                                                         | Non garantis pour la démo ; message si le suivi échoue         |
| Téléphone / fenêtre très étroite | Message explicite, sans demande caméra automatique                                  | Dessin mobile non pris en charge                               |

Les fenêtres de bureau restent utilisables dès 640 pixels CSS avec pointeur
fin. Les petites surfaces tactiles sous 768 pixels affichent le conseil
d'utiliser une tablette en paysage ou un ordinateur. Aucun sniffing de
marque de navigateur n'est nécessaire pour cela.

Bilan daté des exécutions : [validation locale du lot 10](./qa/lot10-local.md).

## Confidentialité

- Aucun compte, serveur d'analyse, analytics ou SDK de télémétrie dans l'app.
- Les frames et landmarks restent en mémoire sur l'appareil ; aucune vidéo
  n'est enregistrée ou téléversée par DrawMotion. Le micro n'est pas demandé.
- Le modèle, les fichiers WASM, polices et illustrations sont servis depuis
  la même origine que l'application. Le navigateur/hébergeur reçoit les
  requêtes normales de téléchargement de ces fichiers, pas les frames.
- L'état du tutoriel est enregistré localement dans `localStorage`. Effacer
  les données du site le réinitialise. Le dessin n'est pas sauvegardé entre
  rechargements : exporter le PNG avant de quitter.
- La pause et le passage de l'onglet en arrière-plan arrêtent la caméra.
- Les diagnostics de développement ne contiennent que des timings et
  compteurs ; ils sont absents du build de production.

Ces constats portent sur le paquet et le build vérifiés, pas sur toutes les
versions de MediaPipe. La [notice amont](https://github.com/google-ai-edge/mediapipe#privacy-notice)
mentionne des métriques selon les API : toute mise à jour exige de refaire le
contrôle réseau sous CSP. Les tests actuels n'observent aucune connexion tierce
lors du chargement et de l'inférence locale.

## Performances

Une seule image est transférée au Worker à la fois. Une seconde peut attendre
dans le thread principal ; toute nouvelle image la remplace en libérant son
ImageBitmap. Cela évite que le Worker synchrone traite une longue file de
positions périmées. Une capture peut être en création pendant cette attente.
Le Worker conserve aussi sa protection de file interne.

Dans la console de `pnpm dev`, activer les messages **Verbose/Debug** pour voir
`[DrawMotion vision]`, au plus une fois toutes les cinq secondes :

- `detectionFps` : fréquence de résultats sur une fenêtre de 120 résultats max ;
- `medianLatencyMs` / `p95LatencyMs` : temps entre soumission du bitmap et
  réception du résultat, incluant son attente (pas capture ni affichage écran) ;
- `droppedFrames` : images remplacées avant transfert ; ce compteur peut
  augmenter normalement lorsque la caméra fournit plus vite que l'inférence.

Ne pas assimiler ces valeurs à une mesure « geste → encre ». Une mesure de
bout en bout nécessite une vidéo horodatée et un appareil réel.

`pnpm verify:bundle` analyse le build local (application et Worker) et vérifie
800 KiB JS brut, 250 KiB JS gzip et 100 KiB CSS brut au total. Ces budgets
laissent une marge sur le prototype actuel (~640 KiB JS brut / ~200 KiB gzip,
~71 KiB CSS). Modèle/WASM exclus : contrôlés séparément par
`pnpm verify:vision-assets`, ils sont chargés au démarrage du suivi.

## En-têtes de production

`vercel.json` interdit les ressources de tiers, les scripts inline et
l'évaluation JavaScript dynamique. `wasm-unsafe-eval` permet la compilation
WASM sans autoriser `unsafe-eval`. Les styles inline restent permis pour les
positions et couleurs dynamiques de Base UI/React. Les images `data:`/`blob:`
et les médias locaux sont autorisés ; les Workers restent de même origine.
L'intégration dans une iframe et les formulaires externes sont interdits.
Le micro, la géolocalisation, USB et paiement sont désactivés par politique.

`pnpm preview` applique les mêmes en-têtes pour les tests locaux, y compris
sur le fichier Worker. `pnpm dev` conserve la configuration de développement
nécessaire à HMR. Le test `security.spec.ts` exécute réellement MediaPipe et
vérifie que la CSP bloque une connexion externe ; les autres tests gestuels
continuent d'utiliser des landmarks déterministes.

Après un déploiement autorisé, vérifier **l'URL HTTPS réelle** :

```sh
pnpm verify:security-headers https://URL-DE-LA-PREVIEW
```

Une preview protégée peut répondre 401/redirect : c'est un contrôle incomplet,
pas une raison de désactiver sa protection. Aucun déploiement n'a été effectué
pour le lot 10 ; la vérification locale ne prouve pas les en-têtes CDN.

## Dépannage

| Symptôme                                  | Action                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Accès refusé                              | Autoriser la caméra dans les paramètres du site, puis Réessayer                                  |
| Caméra occupée                            | Fermer l'autre application qui utilise la webcam                                                 |
| Caméra introuvable                        | Vérifier branchement, autorisations système et adresse HTTPS/localhost                           |
| Suivi indisponible                        | Essayer Chrome/Edge à jour ; exporter puis recharger ; vérifier le chargement des assets locaux  |
| Main non détectée                         | Garder toute la main dans le champ réel, améliorer l'éclairage ; le cercle est un aperçu recadré |
| Tracé saccadé                             | Fermer les tâches lourdes ; vérifier FPS/p95 en développement ; essayer l'autre navigateur       |
| Panneau trop haut au zoom                 | Faire défiler le panneau de réglages, pas la page ; Échap le ferme                               |
| Caméra en pause après changement d'onglet | Cliquer sur son aperçu pour reprendre                                                            |

## Avant la démo publique

Tester physiquement Chrome et Edge : permission, refus/reprise, luminosité
faible, poing/gomme, perte de suivi puis retour éloigné en pinçant sans trait
parasite, zoom natif 200 %, tablette tactile, export et pause en arrière-plan.
Vérifier également la preview HTTPS et ses en-têtes. Ces contrôles restent
des prérequis au lot 11, pas des succès présumés.

Références : [MediaPipe Web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js),
[CSP et WASM](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src),
[Workers et CSP](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#content_security_policy),
[configuration Vercel](https://vercel.com/docs/project-configuration/vercel-json).
