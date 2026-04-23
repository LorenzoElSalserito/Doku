import type { Dictionary } from '../keys.js';

export const fr: Dictionary = {
  app: {
    name: 'Doku',
    loading: 'Préparation de votre studio…',
    errorTitle: 'Quelque chose a mal tourné.',
    unknownError: 'Erreur inconnue',
    skipToEditor: 'Aller directement à l’éditeur',
  },
  languages: {
    it: 'Italiano',
    en: 'English',
    es: 'Español',
    de: 'Deutsch',
    fr: 'Français',
    pt: 'Português',
  },
  themes: {
    light: 'Clair',
    lightDescription: 'Warm Ivory — ton éditorial diurne avec accent azur',
    dark: 'Sombre',
    darkDescription: 'Deep Slate — ton tamisé avec accent azur',
    custom: 'Personnalisé',
    customDescription: 'Une palette éditoriale définie par vous',
    system: 'Système',
    systemDescription: 'Suit les préférences du système',
  },
  wizard: {
    eyebrow: 'Bienvenue dans Doku',
    steps: {
      language: 'Langue',
      theme: 'Thème',
      confirm: 'Prêt',
    },
    language: {
      title: 'Choisissez votre langue',
      subtitle: 'Doku s’adressera à vous dans la langue de votre choix. Vous pouvez la modifier à tout moment.',
    },
    theme: {
      title: 'Choisissez l’atmosphère',
      subtitle: 'Deux identités éditoriales à égalité. L’aperçu se met à jour en direct.',
      previewHeading: 'Une page qui mérite du soin',
      previewBody:
        'Doku place la page au cœur de votre métier. Chaque surface, chaque espace, chaque détail typographique est pensé pour que les mots restent au premier plan.',
    },
    confirm: {
      title: 'Tout est prêt — ouvrez votre studio',
      subtitle: 'Vos préférences sont enregistrées sur cet appareil.',
      languageLabel: 'Langue',
      themeLabel: 'Thème',
      nextSteps:
        'Après le wizard, vous arrivez directement sur la page. Le guide et l’export continuent de grandir dans les prochaines étapes.',
    },
    actions: {
      back: 'Retour',
      next: 'Continuer',
      finish: 'Entrer dans Doku',
    },
  },
  workspace: {
    breadcrumbHome: 'Accueil',
    breadcrumbWorkspace: 'Workspace',
    untitledDocument: 'Document sans titre',
    statusLocal: 'Local-first',
    statusReady: 'Shell prête',
    leftPanelLabel: 'Panneau gauche',
    rightPanelLabel: 'Panneau droit',
    guide: 'Guide',
    export: 'Exporter',
    settings: 'Préférences',
    info: 'À propos',
    fileMenu: {
      trigger: 'Fichier',
      newDocument: 'Nouveau document',
      openFile: 'Ouvrir un fichier…',
      recentHeading: 'Récents',
      recentEmpty: 'Aucun document récent',
    },
    quickActions: {
      toggleShow: 'Afficher les actions rapides',
      toggleHide: 'Masquer les actions rapides',
      barLabel: 'Actions rapides Markdown',
      tableButton: 'Tableau',
      tableRows: 'Lignes',
      tableColumns: 'Colonnes',
      tableInsert: 'Insérer le tableau',
      h1: 'H1',
      h2: 'H2',
      bold: 'Gras',
      italic: 'Italique',
      link: 'Lien',
      image: 'Image',
      bulletList: 'Puces',
      orderedList: 'Numérotée',
      checklist: 'Checklist',
      quote: 'Citation',
      inlineCode: 'Code inline',
      codeBlock: 'Bloc code',
      divider: 'Séparateur',
    },
    workspaceExplorer: {
      title: 'Workspace',
      body: 'Les fichiers du dossier courant restent proches pour que vous puissiez avancer dans le projet sans quitter la page.',
      empty: 'Aucun fichier visible dans ce dossier pour le moment.',
      draftHint: 'Enregistrez ce brouillon pour transformer le panneau gauche en véritable explorateur de workspace.',
      openFolder: 'Dossier courant',
      newFile: 'Nouveau fichier',
      newFolder: 'Nouveau dossier',
      newFilePrompt: 'Nom du nouveau fichier Markdown',
      newFolderPrompt: 'Nom du nouveau dossier',
      createFileError: 'Impossible de créer le fichier. Vérifiez le nom puis réessayez.',
      createFolderError: 'Impossible de créer le dossier. Vérifiez le nom puis réessayez.',
      directory: 'Dossier',
      markdown: 'Fichier Markdown',
      asset: 'Asset',
      other: 'Fichier',
    },
    projectPanelEyebrow: 'Projet',
    projectPanelTitle: 'Un bureau silencieux pour votre manuscrit',
    projectPanelBody:
      'Ce côté accueillera navigation, sections récentes et contexte du projet. Pour l’instant il pose le rythme, la hiérarchie et la respiration.',
    projectPanelMeta: 'La largeur du panneau est déjà conservée entre les sessions.',
    outlineTitle: 'Placeholder de structure',
    outlineBody: 'Titres, structure et accès rapides sont disponibles ici pour parcourir le contenu sans perdre le contexte.',
    notesTitle: 'Placeholder de contexte',
    notesBody: 'Notes, métadonnées et contexte éditorial peuvent vivre ici sans voler l’attention de la page.',
    previewTitle: 'Placeholder de preview',
    previewBody: 'Exports, vérifications de style et aides de lecture arriveront ici progressivement.',
    editorEyebrow: 'Zone d’écriture',
    editorTitle: 'L’éditeur arrive au prochain sprint',
    editorBody:
      'Cette shell fixe les proportions, les transitions et le calme nécessaires au vrai workspace Markdown.',
    editorHint: 'Prochain sprint : Monaco, ouverture/enregistrement et première page éditable.',
    editorLoading: 'Préparation de la page…',
    editorErrorTitle: 'Impossible de charger le document',
    editorErrorBody: 'Vérifiez le chemin du fichier ou rouvrez-le depuis le launcher.',
    missingDocumentNotice:
      'Le document sélectionné n’est plus disponible. Doku a ouvert un nouveau brouillon local et supprimé l’entrée obsolète des récents.',
    save: 'Enregistrer',
    saveAs: 'Enregistrer sous',
    writeMode: 'Écrire',
    previewMode: 'Aperçu',
    splitMode: 'Split',
    previewEyebrow: 'Aperçu',
    previewEmpty: 'Commencez à écrire et l’aperçu éditorial apparaîtra ici.',
    imageDropzoneEyebrow: 'Déposer une image',
    imageDropzoneTitle: 'Déposez l’image pour l’importer dans ce document.',
    imageImportSuccess: 'Image ajoutée : {{fileName}}',
    imageImportSaveFirst: 'Enregistrez le document avant d’importer des images.',
    imageImportUnsupported: 'Ce format d’image n’est pas pris en charge.',
    imageImportMissingSource: 'L’image sélectionnée n’est plus disponible.',
    imageImportAllocationFailed: 'Doku n’a pas pu réserver un chemin local propre pour l’image.',
    savedStatus: 'Enregistré',
    dirtyStatus: 'Modifications non enregistrées',
    savingStatus: 'Enregistrement…',
    errorStatus: 'Erreur d’enregistrement',
    savedAtLabel: 'Dernier enregistrement',
    autosaveLabel: 'Autosave actif',
    draftLabel: 'Brouillon',
    fileLabel: 'Fichier Markdown',
    wordCountLabel: 'Mots',
    charCountLabel: 'Caractères',
    recentDocumentsTitle: 'Documents récents',
    recentDocumentsBody: 'Revenez rapidement aux pages touchées le plus récemment.',
    sessionTitle: 'Session en cours',
    sessionBody: 'Un aperçu rapide de l’enregistrement, de la vue active et de l’état local du document.',
    sessionUpdatedLabel: 'Mis à jour',
    sessionViewModeLabel: 'Vue',
    sessionStorageLabel: 'Stockage',
    sessionStorageDraft: 'Brouillon local',
    sessionStorageFile: 'Fichier lié',
    untitledPlaceholderBody: 'Une page blanche, prête pour la première ligne.',
    leftPanelToggleCollapse: 'Réduire le panneau gauche',
    leftPanelToggleExpand: 'Ouvrir le panneau gauche',
    rightPanelToggleCollapse: 'Réduire le panneau droit',
    rightPanelToggleExpand: 'Ouvrir le panneau droit',
    resizeLeftPanel: 'Redimensionner le panneau gauche',
    resizeRightPanel: 'Redimensionner le panneau droit',
  },
  settings: {
    title: 'Préférences',
    subtitle: 'Tout reste sur cet appareil.',
    languageLabel: 'Langue',
    languageHint: 'Appliqué immédiatement, aucun redémarrage nécessaire.',
    themeLabel: 'Thème',
    themeHint: 'Clair, sombre ou aligné sur le système.',
    fontLabel: 'Police d’écriture',
    fontHint: 'S’applique à l’éditeur et à l’aperçu en utilisant les polices déjà installées sur ce système.',
    fontLoading: 'Chargement des polices système…',
    fontDefault: 'Police Doku par défaut',
    fontLatexNotice: 'Les polices système personnalisées ne sont pas intégrées dans l’export LuaLaTeX.',
    openDefaultApps: 'Ouvrir les préférences des apps par défaut',
    defaultAppsHint: 'Vous pouvez aussi définir Doku comme app par défaut pour les fichiers .md depuis les réglages système.',
    uninstallPreparationLabel: 'Préparation à la désinstallation',
    uninstallPreparationButton: 'Préparation à la désinstallation',
    uninstallPreparationWorking: 'Nettoyage en cours…',
    uninstallPreparationHint:
      'Supprime les préférences, sauvegardes automatiques, logs et données locales de Doku, puis ferme l’app. À utiliser avant la désinstallation.',
    uninstallPreparationConfirm:
      'Supprimer définitivement toutes les données utilisateur de Doku et fermer l’app ?',
    customThemeOpen: 'Modifier le thème personnalisé',
    customThemeHint: 'Ajustez les tokens principaux de la palette et appliquez-les à Doku.',
    close: 'Terminé',
    customTheme: {
      title: 'Thème personnalisé',
      subtitle: 'Créez votre propre palette éditoriale et appliquez-la sans redémarrer l’application.',
      reset: 'Réinitialiser',
      apply: 'Appliquer',
      close: 'Fermer',
      modeLabel: 'Base du thème',
      previewLabel: 'Aperçu',
      fields: {
        base: 'Base',
        surface: 'Surface',
        elevated: 'Elevated',
        accent: 'Accent',
        accentSoft: 'Accent soft',
        textPrimary: 'Texte principal',
        textSecondary: 'Texte secondaire',
        border: 'Bordure',
        focusRing: 'Focus ring',
      },
    },
  },
  defaultAppPrompt: {
    title: 'Définir Doku comme app par défaut pour les fichiers .md',
    subtitle: 'Doku ouvre seulement les préférences système. Rien ne sera modifié en silence.',
    openPreferences: 'Ouvrir les préférences système',
    notNow: 'Pas maintenant',
    linuxHint: 'Sous Linux, le chemin exact dépend de votre environnement de bureau.',
  },
  exportDialog: {
    title: 'Exporter en PDF',
    subtitle: 'Choisissez le profil PDF le plus adapté au document et générez-le en local.',
    profileLabel: 'Profil PDF',
    profiles: {
      lualatex: {
        label: 'Typographique',
        title: 'PDF typographique',
        description:
          'Plus éditorial et plus proche d’une page imprimée. Idéal quand la hiérarchie, le rythme serif et le ton livre comptent.',
      },
      weasy: {
        label: 'Web/impression',
        title: 'PDF style web',
        description:
          'Plus proche de HTML et du print CSS. Utile pour une page plus moderne, proche du navigateur.',
      },
    },
    documentLabel: 'Document',
    outputLabel: 'Chemin de sortie',
    outputHint: 'Doku prépare le PDF et l’enregistre à l’emplacement choisi.',
    confirm: 'Exporter le PDF',
    exporting: 'Export en cours…',
    close: 'Fermer',
    successTitle: 'Export terminé',
    successBody: 'Le PDF a été généré avec succès à cet emplacement.',
    errorTitle: 'Échec de l’export',
    errorGeneric: 'L’export PDF a échoué avant la génération du fichier.',
    resultEngineLabel: 'Profil utilisé',
  },
  info: {
    title: 'Doku',
    subtitle: 'Un studio éditorial local pour l’écriture Markdown.',
    versionLabel: 'Version',
    licenseLabel: 'Licence',
    local: 'Tout reste sur cet appareil.',
    donations: 'Dons',
    reportBug: 'Signaler un bug',
    close: 'Fermer',
  },
  guideCenter: {
    title: 'Guide Center',
    subtitle: 'Doku s’explique lui-même sans vous faire quitter la page.',
    searchLabel: 'Rechercher dans le guide',
    searchPlaceholder: 'Markdown, panneaux, raccourcis…',
    navLabel: 'Sections du guide',
    noResults: 'Aucune section ne correspond à la recherche actuelle.',
    close: 'Fermer le guide',
    copy: 'Copier l’extrait',
    copied: 'Extrait copié',
    livePreview: 'Aperçu en direct',
    sections: {
      quickStart: {
        title: 'Démarrage rapide',
        summary: 'Prenez la page et commencez à écrire.',
        intro:
          'Doku est conçu pour réduire la friction de départ : ouvrir, écrire, enregistrer. L’interface reste calme et utile au lieu d’imposer une configuration préalable.',
        bullets: [
          'Utilisez Fichier pour créer un nouveau document ou ouvrir un Markdown existant.',
          'Écrivez au centre, surveillez l’état et le mode d’affichage dans l’en-tête, puis laissez l’auto-enregistrement gérer la routine.',
          'Passez entre Écriture, Aperçu et Split selon le moment de rédaction ou de révision.',
        ],
        snippetLabel: 'Extrait de départ',
        snippet: `# Titre du document

Écrivez le paragraphe d’ouverture sans vous presser.

- Un point clé
- Un détail utile
- Une fin nette`,
      },
      uiTour: {
        title: 'Tour de l’interface',
        summary: 'Comprendre la shell en quelques secondes.',
        intro:
          'L’interface de Doku est répartie en zones simples : un en-tête léger, une page centrale et des panneaux latéraux optionnels. Chaque partie a une seule fonction.',
        bullets: [
          'L’en-tête rassemble fichier, modes d’affichage, enregistrement, guide, export et réglages.',
          'Le panneau gauche montre le contexte du document, les métriques et la structure rapide.',
          'Le panneau droit accueille notes, aide à la lecture et surfaces secondaires.',
        ],
      },
      markdown: {
        title: 'Markdown essentiel',
        summary: 'Les formes de base que vous utilisez le plus.',
        intro:
          'Pour bien écrire en Markdown, quelques motifs récurrents suffisent. Doku les garde lisibles dans l’éditeur comme dans l’aperçu.',
        bullets: [
          'Utilisez `#` et `##` pour poser une hiérarchie claire avant même le texte long.',
          'Listes et citations servent bien pour les notes, plans, révisions et matériaux d’appui.',
          'Le code inline et les blocs délimités sont utiles quand la syntaxe ou les chemins doivent rester précis.',
        ],
        snippetLabel: 'Exemple Markdown',
        snippet: `# Chapitre un

Un paragraphe avec **accent** et \`code inline\`.

> Une citation brève pour donner le ton.

1. Première idée
2. Deuxième idée
3. Clôture`,
      },
      shortcuts: {
        title: 'Raccourcis et rythme',
        summary: 'Moins de souris, plus de continuité.',
        intro:
          'Doku favorise un flux calme. Les actions fréquentes restent proches, mais le clavier doit pouvoir porter tout le parcours principal.',
        bullets: [
          'Utilisez Échap pour fermer menus et dialogues quand vous voulez revenir immédiatement à la page.',
          'Utilisez Cmd/Ctrl+S pour enregistrer et Cmd/Ctrl+Shift+S pour ouvrir Enregistrer sous.',
          'Enregistrez régulièrement même avec l’auto-enregistrement : l’état vous dit toujours où vous en êtes.',
          'Gardez les panneaux fermés pendant la rédaction et rouvrez-les seulement pour la relecture ou la structure.',
        ],
      },
      manual: {
        title: 'Manuel Markdown',
        summary: 'Référence complète intégrée signée Lorenzo DM.',
        intro:
          'Cette section intègre le manuel Markdown complet dans le produit et le présente comme référence éditoriale de Lorenzo DM.',
        bullets: [
          'La structure suit le manuel complet avec syntaxe de base et syntaxe étendue.',
          'Chaque bloc d’exemple peut être copié directement et testé dans Doku.',
          'L’aperçu en direct montre immédiatement la différence entre la syntaxe brute et le rendu final.',
        ],
        snippetLabel: 'Manuel complet',
        snippet: `# Manuel Markdown

Version : 20201226  
Par Lorenzo DM

Cette fiche essentielle part du matériel de référence de [Markdown Guide](https://www.markdownguide.org) et a été adaptée à un usage pratique dans Doku.

## Sommaire

### Fondamentaux

1. [Syntaxe de base](#syntaxe-de-base)
2. [Titres](#titres)
3. [Gras](#gras)
4. [Italique](#italique)
5. [Bloc de citation](#bloc-de-citation)
6. [Listes](#listes)
7. [Code](#code)
8. [Ligne de séparation](#ligne-de-separation)
9. [Liens](#liens)
10. [Images](#images)

### Extensions utiles

1. [Syntaxe étendue](#syntaxe-etendue)
2. [Notes de bas de page](#notes-de-bas-de-page)
3. [Tableaux](#tableaux)
4. [Exposant et indice](#exposant-et-indice)
5. [Blocs de code](#blocs-de-code)
6. [ID et liens d’ancrage](#id-et-liens-dancrage)
7. [Texte surligné](#texte-surligne)
8. [Caractères spéciaux](#caracteres-speciaux)

## Syntaxe de base

Voici les éléments définis par le Markdown original de John Gruber. Presque toutes les applications les prennent en charge.

## Titres

Laissez toujours un espace entre \`#\` et le texte.

\`\`\`md
# Titre 1
## Titre 2
### Titre 3
#### Titre 4
##### Titre 5
###### Titre 6
\`\`\`

## Gras

\`\`\`md
**texte en gras**
\`\`\`

Résultat : **texte en gras**

## Italique

\`\`\`md
_texte en italique_
*texte en italique*
\`\`\`

Résultat : _texte en italique_ ou *texte en italique*

Combinaisons utiles :

\`\`\`md
_texte avec **accent partiel**_
**_texte très accentué_**
\`\`\`

## Bloc de citation

\`\`\`md
> Premier paragraphe.
>
> Deuxième paragraphe.
\`\`\`

> Premier paragraphe.
>
> Deuxième paragraphe.

## Listes

### Liste numérotée

\`\`\`md
1. Premier élément
2. Deuxième élément
    1. Premier sous-élément
    2. Autre sous-élément
3. Troisième élément
\`\`\`

### Liste non numérotée

\`\`\`md
- Premier élément
- Deuxième élément
    - Sous-élément
    - Autre sous-élément
- Troisième élément
\`\`\`

## Code

Pour le code inline, utilisez le backtick accent grave.

\`\`\`md
\`code\`
\`\`\`

Résultat : \`code\`

## Ligne de séparation

\`\`\`md
***
\`\`\`

***

Pensez à laisser une ligne vide après la séparation.

## Liens

\`\`\`md
[Liber Liber](https://www.liberliber.it)
<https://www.liberliber.it>
\`\`\`

## Images

\`\`\`md
![texte descriptif](immagini/image.jpg)
_voici la légende_
\`\`\`

Ou une image sur le web :

\`\`\`md
![Liber Liber](https://www.liberliber.it/online/wp-content/uploads/2017/03/logo_liberliber.png)
*Ceci est le logo de Liber Liber*
\`\`\`

## Syntaxe étendue

Beaucoup d’applications modernes prennent en charge des fonctions supplémentaires au-delà du Markdown de base.

## Notes de bas de page

\`\`\`md
Ici nous avons la référence à une note[^1].

[^1]: Et voici la note.
\`\`\`

## Tableaux

\`\`\`md
| gauche | centre | droite |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |
\`\`\`

| gauche | centre | droite |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |

## Exposant et indice

\`\`\`md
X^2^
H~2~O
\`\`\`

Résultat attendu dans les moteurs compatibles : X^2^ et H~2~O

## Blocs de code

\`\`\`\`md
\`\`\`
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
\`\`\`
\`\`\`\`

## ID et liens d’ancrage

\`\`\`md
#### Titre d’exemple {#un-titre}
[Aller au titre](#un-titre)
[Aller à un titre normal](#titre-cliquable)
\`\`\`

## Texte surligné

\`\`\`md
==Ceci est un texte surligné==
\`\`\`

## Caractères spéciaux

Quand c’est nécessaire, faites précéder les symboles d’un backslash :

\`\`\`md
\\\` \\* \\_ \\{ \\} \\[ \\] \\( \\) \\< \\> \\# \\+ \\. \\! \\|
\`\`\`

## Note finale

Toutes les extensions ne sont pas prises en charge par tous les convertisseurs, mais cette fiche couvre les formes les plus utiles pour le travail éditorial quotidien dans Doku.`,
      },
    },
  },
};
