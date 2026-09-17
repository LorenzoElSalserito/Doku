import type { Dictionary } from '../keys.js';

export const es: Dictionary = {
  app: {
    name: 'Doku',
    loading: 'Abriendo el espacio de trabajo…',
    errorTitle: 'Algo salió mal.',
    unknownError: 'Error desconocido',
    skipToEditor: 'Saltar al editor',
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
    light: 'Claro',
    lightDescription: 'Warm Ivory — tono editorial diurno con acento azul',
    dark: 'Oscuro',
    darkDescription: 'Deep Slate — tono tenue con acento azul',
    custom: 'Personalizado',
    customDescription: 'Una paleta editorial definida por ti',
    system: 'Sistema',
    systemDescription: 'Sigue las preferencias del sistema',
  },
  wizard: {
    eyebrow: 'Te damos la bienvenida a Doku',
    steps: {
      language: 'Idioma',
      theme: 'Tema',
      font: 'Fuente',
      confirm: 'Listo',
    },
    language: {
      title: 'Elige tu idioma',
      subtitle: 'Doku hablará el idioma que prefieras. Puedes cambiarlo en cualquier momento.',
    },
    theme: {
      title: 'Elige la atmósfera',
      subtitle: 'Dos identidades editoriales de igual calidad. La vista previa se actualiza al instante.',
      previewHeading: 'Una página que vale la pena cuidar',
      previewBody:
        'Doku entiende la página como el corazón de tu oficio. Cada superficie, cada espacio y cada detalle tipográfico está pensado para que las palabras queden en primer plano.',
    },
    font: {
      title: 'Elige tu fuente de escritura',
      subtitle:
        'Elige la tipografía que Doku usará en interfaz, editor, vista previa y exportación PDF.',
      previewLabel: 'Vista previa',
      sampleText:
        'Un párrafo claro facilita leer, editar y exportar notas largas.',
    },
    confirm: {
      title: 'Todo listo — abre tu estudio',
      subtitle: 'Tus preferencias se guardan en este dispositivo.',
      languageLabel: 'Idioma',
      themeLabel: 'Tema',
      fontLabel: 'Fuente',
      nextSteps:
        'Después del wizard entras directamente en la página. Guía y exportación seguirán creciendo en las próximas entregas.',
    },
    actions: {
      back: 'Atrás',
      next: 'Continuar',
      finish: 'Entrar en Doku',
    },
  },
  workspace: {
    breadcrumbHome: 'Inicio',
    breadcrumbWorkspace: 'Workspace',
    untitledDocument: 'Documento sin título',
    statusLocal: 'Local-first',
    statusReady: 'Shell lista',
    documentTitleLabel: 'Título del documento',
    documentTitlePlaceholder: 'Título del documento',
    leftPanelLabel: 'Panel izquierdo',
    rightPanelLabel: 'Panel derecho',
    guide: 'Guía',
    export: 'Exportar',
    settings: 'Preferencias',
    info: 'Acerca de',
    fileMenu: {
      trigger: 'Archivo',
      newDocument: 'Nuevo documento',
      openFile: 'Abrir archivo…',
      recentHeading: 'Recientes',
      recentEmpty: 'Sin documentos recientes',
    },
    tabs: {
      label: 'Documentos abiertos',
      close: 'Cerrar documento',
      closeDirtyConfirm: 'Este documento tiene cambios sin guardar. ¿Cerrar de todos modos?',
      missingDocumentFile: 'El archivo ya no está disponible en el disco.',
      reopenFromDisk: 'Reabrir desde disco',
      scrollPrev: 'Desplazar pestañas a la izquierda',
      scrollNext: 'Desplazar pestañas a la derecha',
    },
    quickActions: {
      toggleShow: 'Mostrar acciones rápidas',
      toggleHide: 'Ocultar acciones rápidas',
      barLabel: 'Acciones rápidas Markdown',
      tableButton: 'Tabla',
      tableRows: 'Filas',
      tableColumns: 'Columnas',
      tableInsert: 'Insertar tabla',
      h1: 'H1',
      h2: 'H2',
      bold: 'Negrita',
      italic: 'Cursiva',
      link: 'Enlace',
      image: 'Imagen',
      bulletList: 'Viñetas',
      orderedList: 'Numerada',
      checklist: 'Checklist',
      quote: 'Cita',
      inlineCode: 'Código inline',
      codeBlock: 'Bloque código',
      divider: 'Separador',
      mermaidDiagram: 'Diagrama',
      markmapMindmap: 'Mapa mental',
      chartBlock: 'Gráfico',
    },
    immersive: {
      enter: 'Modo inmersivo',
      exit: 'Salir del modo inmersivo',
    },
    contentColors: {
      button: 'Colores',
      title: 'Colores del contenido',
      link: 'Enlaces',
      heading: 'Títulos',
      code: 'Bloques de código',
      quote: 'Citas',
      reset: 'Restablecer',
    },
    previewZoom: {
      label: 'Zoom de vista previa',
      zoomIn: 'Acercar',
      zoomOut: 'Alejar',
      reset: 'Restablecer zoom',
      fitWidth: 'Ajustar al ancho',
      fitPage: 'Ajustar al alto',
    },
    previewInvert: {
      invert: 'Invertir los colores de la vista previa',
      restore: 'Restaurar los colores de la vista previa',
    },
    visualBlocks: {
      loading: 'Cargando bloque visual…',
      fallback: 'Bloque visual',
      errorTitle: 'Bloque visual no válido',
      mermaidLabel: 'Diagrama Mermaid',
      markmapLabel: 'Mapa mental Markmap',
      chartLabel: 'Gráfico Recharts',
    },
    workspaceExplorer: {
      title: 'Workspace',
      body: 'Los archivos de la carpeta actual permanecen cerca para que te muevas por el proyecto sin salir de la página.',
      empty: 'Todavía no hay archivos visibles en esta carpeta.',
      draftHint: 'Guarda este borrador para convertir el panel izquierdo en un explorador real del workspace.',
      openFolder: 'Carpeta actual',
      newFile: 'Nuevo archivo',
      newFolder: 'Nueva carpeta',
      newFilePrompt: 'Nombre del nuevo archivo Markdown',
      newFolderPrompt: 'Nombre de la nueva carpeta',
      createFileError: 'No se pudo crear el archivo. Revisa el nombre e inténtalo de nuevo.',
      createFolderError: 'No se pudo crear la carpeta. Revisa el nombre e inténtalo de nuevo.',
      directory: 'Carpeta',
      markdown: 'Archivo Markdown',
      asset: 'Asset',
      other: 'Archivo',
    },
    projectPanelEyebrow: 'Proyecto',
    projectPanelTitle: 'Tu segunda mente',
    projectPanelBody:
      'Este lado alojará navegación, secciones recientes y contexto del proyecto. Por ahora define ritmo, jerarquía y aire.',
    projectPanelMeta: 'El ancho del panel ya se guarda entre sesiones.',
    outlineTitle: 'Placeholder de estructura',
    outlineBody: 'Aquí tienes títulos, estructura y saltos rápidos para moverte por el contenido sin perder el contexto.',
    notesTitle: 'Placeholder de contexto',
    notesBody: 'Notas, metadatos y contexto editorial pueden vivir en este lado sin quitar protagonismo a la página.',
    previewTitle: 'Placeholder de preview',
    previewBody: 'Exportaciones, controles de estilo y ayudas de lectura llegarán aquí gradualmente.',
    editorEyebrow: 'Área de escritura',
    editorTitle: 'El editor llega en el próximo sprint',
    editorBody:
      'Esta shell fija proporciones, transiciones y la calma necesarias para el verdadero workspace Markdown.',
    editorHint: 'Próximo sprint: Monaco, abrir/guardar y la primera página editable.',
    editorLoading: 'Preparando la página…',
    editorErrorTitle: 'No se pudo cargar el documento',
    editorErrorBody: 'Comprueba la ruta del archivo o vuelve a abrirlo desde el launcher.',
    missingDocumentNotice:
      'El documento seleccionado ya no está disponible. Doku mantuvo la pestaña abierta y eliminó la referencia obsoleta de los recientes.',
    save: 'Guardar',
    saveAs: 'Guardar como',
    writeMode: 'Escribir',
    previewMode: 'Vista previa',
    splitMode: 'Split',
    previewEyebrow: 'Vista previa',
    previewEmpty: 'Empieza a escribir y la vista editorial aparecerá aquí.',
    imageDropzoneEyebrow: 'Soltar imagen',
    imageDropzoneTitle: 'Suelta la imagen para importarla en este documento.',
    imageImportSuccess: 'Imagen añadida: {{fileName}}',
    imageImportSaveFirst: 'Guarda el documento antes de importar imágenes.',
    imageImportUnsupported: 'Este formato de imagen no es compatible.',
    imageImportMissingSource: 'La imagen seleccionada ya no está disponible.',
    imageImportAllocationFailed: 'Doku no pudo reservar una ruta local limpia para la imagen.',
    savedStatus: 'Guardado',
    dirtyStatus: 'Cambios sin guardar',
    savingStatus: 'Guardando…',
    errorStatus: 'Error al guardar',
    savedAtLabel: 'Último guardado',
    autosaveLabel: 'Autoguardado activo',
    draftLabel: 'Borrador',
    fileLabel: 'Archivo Markdown',
    wordCountLabel: 'Palabras',
    charCountLabel: 'Caracteres',
    recentDocumentsTitle: 'Documentos recientes',
    recentDocumentsBody: 'Vuelve rápido a las páginas que tocaste más recientemente.',
    sessionTitle: 'Sesión actual',
    sessionBody: 'Una lectura rápida del guardado, la vista activa y el estado local del documento.',
    sessionUpdatedLabel: 'Actualizado',
    sessionViewModeLabel: 'Vista',
    sessionStorageLabel: 'Almacenamiento',
    sessionStorageDraft: 'Borrador local',
    sessionStorageFile: 'Archivo vinculado',
    untitledPlaceholderBody: 'Una página en blanco, lista para la primera línea.',
    leftPanelToggleCollapse: 'Cerrar panel izquierdo',
    leftPanelToggleExpand: 'Abrir panel izquierdo',
    rightPanelToggleCollapse: 'Cerrar panel derecho',
    rightPanelToggleExpand: 'Abrir panel derecho',
    resizeLeftPanel: 'Redimensionar panel izquierdo',
    resizeRightPanel: 'Redimensionar panel derecho',
  },
  settings: {
    title: 'Preferencias',
    subtitle: 'Todo permanece en este dispositivo.',
    languageLabel: 'Idioma',
    languageHint: 'Se aplica al instante, sin reiniciar.',
    themeLabel: 'Tema',
    themeHint: 'Claro, oscuro o siguiendo el sistema.',
    zoomLabel: 'Zoom de la app',
    zoomHint: 'Escala toda la interfaz sin cambiar la fuente de Doku seleccionada.',
    restartNotice: 'Reinicia Doku para aplicar los cambios visuales de forma limpia.',
    fontLabel: 'Tipografia',
    fontHint: 'Cada selector usa el catalogo completo de fuentes Doku definido en FONTS.md.',
    fontLoading: 'Cargando fuentes del sistema…',
    fontDefault: 'Predeterminado de Doku',
    fontLatexNotice: 'La exportacion PDF recibe las fuentes Doku seleccionadas para texto y codigo.',
    fontProfileLabel: 'Configuracion de fuentes',
    fontUiLabel: 'UI',
    fontPdfLabel: 'PDF y vista previa',
    fontMonoLabel: 'Codigo',
    fontAccessibilityLabel: 'Accesibilidad',
    fontAccessibilityMode: 'Usar la fuente accesible en la interfaz y el area de escritura',
    fontProfiles: {
      professional: 'Profesional',
      allPurpose: 'Multiuso',
    },
    openDefaultApps: 'Abrir preferencias de apps predeterminadas',
    defaultAppsHint: 'También puedes configurar Doku como app predeterminada para archivos .md desde los ajustes del sistema.',
    uninstallPreparationLabel: 'Preparación para la desinstalación',
    uninstallPreparationButton: 'Preparación para la desinstalación',
    uninstallPreparationWorking: 'Limpiando…',
    uninstallPreparationHint:
      'Elimina ajustes, autoguardados, logs y datos locales de Doku, y después cierra la app. Úsalo antes de desinstalar.',
    uninstallPreparationConfirm:
      '¿Eliminar definitivamente todos los datos de usuario de Doku y cerrar la app?',
    customThemeOpen: 'Editar tema personalizado',
    customThemeHint: 'Ajusta los tokens principales de la paleta y aplícalos a Doku.',
    close: 'Hecho',
    customTheme: {
      title: 'Tema personalizado',
      subtitle: 'Crea tu propia paleta editorial y aplícala sin reiniciar la aplicación.',
      reset: 'Restablecer',
      apply: 'Aplicar',
      close: 'Cerrar',
      modeLabel: 'Base del tema',
      previewLabel: 'Vista previa',
      fields: {
        base: 'Base',
        surface: 'Surface',
        elevated: 'Elevated',
        accent: 'Accent',
        accentSoft: 'Accent soft',
        textPrimary: 'Texto primario',
        textSecondary: 'Texto secundario',
        border: 'Borde',
        focusRing: 'Focus ring',
      },
    },
  },
  defaultAppPrompt: {
    title: 'Configurar Doku como app predeterminada para archivos .md',
    subtitle: 'Doku solo abrirá las preferencias del sistema. No cambiará nada en silencio.',
    openPreferences: 'Abrir preferencias del sistema',
    notNow: 'Ahora no',
    dontAskAgain: 'No volver a preguntar',
    linuxHint: 'En Linux, la ruta exacta depende de tu entorno de escritorio.',
  },
  exportDialog: {
    title: 'Exportar PDF',
    subtitle: 'Elige el perfil PDF más adecuado para este documento y genéralo localmente.',
    profileLabel: 'Perfil PDF',
    profiles: {
      lualatex: {
        label: 'Tipográfico',
        title: 'PDF tipográfico',
        description:
          'Más editorial y cercano a la página impresa. Ideal cuando importan la jerarquía, el ritmo serif y el tono de libro.',
      },
      weasy: {
        label: 'Web/impresión',
        title: 'PDF estilo web',
        description:
          'Más cercano a HTML y print CSS. Útil cuando quieres una página moderna, parecida al navegador.',
      },
    },
    documentLabel: 'Documento',
    outputLabel: 'Ruta de salida',
    outputHint: 'Doku está preparando el PDF y guardándolo en el destino elegido.',
    confirm: 'Exportar PDF',
    exporting: 'Exportando…',
    close: 'Cerrar',
    successTitle: 'Exportación completada',
    successBody: 'El PDF se generó correctamente en esta ruta.',
    errorTitle: 'La exportación falló',
    errorGeneric: 'La exportación PDF falló antes de generar el archivo.',
    resultEngineLabel: 'Perfil usado',
    capturing: 'Generando diagramas y gráficos para el PDF…',
    visualNote: 'Los diagramas Mermaid, los mapas Markmap y los gráficos se incrustan como imágenes, exactamente como los muestra la vista previa.',
    a4Note: 'Hoja A4, márgenes de encuadernación espejados, números de página: el PDF coincide con la página de la vista previa.',
  },
  info: {
    title: 'Doku',
    subtitle: 'Tu segunda mente',
    versionLabel: 'Versión',
    licenseLabel: 'Licencia',
    local: 'Todo permanece en este dispositivo.',
    donations: 'Donaciones',
    support: {
      title: 'Apoya a Doku',
      body: 'Doku es gratuito, de código abierto y vive solo en tu dispositivo. Una donación lo mantiene así y financia las próximas funciones.',
      cta: 'Apóyame con una donación',
      note: 'Página segura de PayPal, se abre en el navegador.',
    },
    reportBug: 'Reportar un error',
    close: 'Cerrar',
  },
  fontCatalog: {
    use: {
      'Inter': 'Interfaces modernas y apps de escritorio',
      'Roboto': 'Texto de interfaz de uso general',
      'Open Sans': 'Apps profesionales y documentos',
      'IBM Plex Sans': 'Software empresarial y textos de producto',
      'Ubuntu': 'Notas de escritorio con tono amable',
      'Source Sans 3': 'Documentos largos e interfaces',
      'Work Sans': 'Títulos en pantalla e interfaz',
      'Nunito': 'Notas informales de tono suave',
      'Manrope': 'Interfaces minimalistas y paneles',
      'Source Serif 4': 'Informes, manuales, PDF profesionales',
      'Merriweather': 'Páginas impresas y PDF legibles',
      'Lora': 'Documentos editoriales de lectura larga',
      'Libre Baskerville': 'PDF clásicos y formales',
      'EB Garamond': 'Libros, ensayos, PDF clásicos',
      'Crimson Pro': 'Narrativa y manuscritos',
      'Playfair Display': 'Títulos editoriales y portadas',
      'JetBrains Mono': 'Código y datos técnicos',
      'Fira Code': 'Código con ligaduras',
      'Roboto Mono': 'Tablas y código',
      'Source Code Pro': 'Código y documentación técnica',
      'Inconsolata': 'Código compacto y tablas',
      'OpenDyslexic': 'Lectura facilitada para la dislexia',
      'Atkinson Hyperlegible': 'Alta legibilidad para todos',
      'Lexend': 'Lectura fluida, menos fatiga',
      'Noto Sans': 'Cobertura universal, cualquier idioma',
      'Montserrat': 'Títulos geométricos y carteles',
      'Raleway': 'Títulos elegantes y portadas',
      'Rubik': 'Interfaces redondeadas y amables',
      'Karla': 'Grotesca compacta para notas',
      'Public Sans': 'Documentos institucionales neutros',
      'Outfit': 'Títulos geométricos modernos',
      'DM Sans': 'Interfaz y texto limpios',
      'Figtree': 'Texto de interfaz ligero y amable',
      'Noto Serif': 'Serif universal para cualquier idioma',
      'Literata': 'Lectura larga y libros electrónicos',
      'Bitter': 'Slab serif para lectura en pantalla',
      'Alegreya': 'Prosa literaria y ensayos',
      'Vollkorn': 'Texto clásico y cálido',
      'Newsreader': 'Tipografía editorial y periodística',
      'Cormorant Garamond': 'Serif display para portadas',
      'Red Hat Mono': 'Código compacto y legible',
      'Atkinson Hyperlegible Next': 'Máxima legibilidad, más pesos',
    },
    preview: {
      sans: 'Escritura de interfaz clara',
      serif: 'Prosa editorial de lectura larga',
      monospace: 'Código, tablas, metadatos',
      accessibility: 'Lectura accesible y fluida',
    },
  },
  guideCenter: {
    title: 'Guide Center',
    subtitle: 'Doku se explica a sí mismo sin sacarte de la página.',
    searchLabel: 'Buscar en la guía',
    searchPlaceholder: 'Markdown, paneles, atajos…',
    navLabel: 'Secciones de la guía',
    noResults: 'Ninguna sección coincide con la búsqueda actual.',
    close: 'Cerrar guía',
    copy: 'Copiar fragmento',
    copied: 'Fragmento copiado',
    livePreview: 'Vista previa en vivo',
    resultsCount: '{{count}} secciones',
    outlineTitle: 'Índice',
    outlineBody: 'Salta a cualquier capítulo del manual.',
    shortcutKeysHeader: 'Teclas',
    shortcutActionHeader: 'Acción',
    sections: {
      quickStart: {
        title: 'Inicio rápido',
        summary: 'Toma la página y empieza a escribir.',
        intro:
          'Doku está pensado para reducir la fricción inicial: abres, escribes y guardas. La interfaz permanece tranquila y útil, sin pedir configuración prematura.',
        bullets: [
          'Usa Archivo para crear un documento nuevo o abrir un Markdown existente.',
          'Escribe en el centro, controla estado y modo de vista desde el encabezado y deja que el autoguardado cubra la rutina.',
          'Alterna entre Escritura, Vista previa y Dividido según el momento de redacción o revisión.',
        ],
        snippetLabel: 'Fragmento inicial',
        snippet: `# Título del documento

Escribe el párrafo inicial con calma.

- Un punto clave
- Un detalle útil
- Un cierre limpio`,
      },
      uiTour: {
        title: 'Recorrido de la interfaz',
        summary: 'Entiende la shell en segundos.',
        intro:
          'La interfaz de Doku se divide en zonas simples: encabezado ligero, página central y paneles laterales opcionales. Cada parte tiene una sola función.',
        bullets: [
          'El encabezado reúne archivo, modos de vista, guardado, guía, exportación y ajustes.',
          'El panel izquierdo muestra contexto del documento, métricas y estructura rápida.',
          'El panel derecho alberga notas, apoyo de lectura y superficies secundarias.',
        ],
      },
      markdown: {
        title: 'Markdown básico',
        summary: 'Las formas esenciales que más usas.',
        intro:
          'Para escribir bien en Markdown basta con un pequeño conjunto de patrones recurrentes. Doku los mantiene legibles tanto en el editor como en la vista previa.',
        bullets: [
          'Usa `#` y `##` para construir una jerarquía clara antes del texto largo.',
          'Las listas y citas sirven bien para notas, esquemas, revisiones y material de apoyo.',
          'El código en línea y los bloques cercados ayudan cuando necesitas sintaxis o rutas exactas.',
        ],
        snippetLabel: 'Ejemplo Markdown',
        snippet: `# Capítulo uno

Un párrafo con **énfasis** y \`código inline\`.

> Una cita breve para fijar el tono.

1. Primera idea
2. Segunda idea
3. Cierre`,
      },
      shortcuts: {
        title: 'Atajos y ritmo',
        summary: 'Menos ratón, más continuidad.',
        intro:
          'Doku premia un flujo sereno. Las acciones frecuentes están cerca, pero el teclado debe sostener todo el recorrido base.',
        bullets: [
          'Usa Escape para cerrar menús y diálogos cuando quieras volver enseguida a la página.',
          'Usa Cmd/Ctrl+S para guardar y Cmd/Ctrl+Shift+S para abrir Guardar como.',
          'Guarda con regularidad aunque el autoguardado esté activo: el estado siempre te dice dónde estás.',
          'Mantén los paneles cerrados al redactar y ábrelos solo durante revisión o control de estructura.',
        ],
        items: [
          { keys: 'Ctrl/Cmd + S', action: 'Guardar el documento' },
          { keys: 'Ctrl/Cmd + Mayús + S', action: 'Guardar como…' },
          { keys: 'Ctrl/Cmd + N', action: 'Nuevo documento vacío' },
          { keys: 'Ctrl/Cmd + W', action: 'Cerrar la pestaña activa' },
          { keys: 'Ctrl/Cmd + Tab', action: 'Pestaña siguiente (Mayús para la anterior)' },
          { keys: 'Ctrl/Cmd + 1…9', action: 'Ir a la pestaña 1…9' },
          { keys: 'Esc', action: 'Cierra menús, diálogos y modo inmersivo' },
          { keys: '↑ ↓ / RePág AvPág / Inicio Fin / Espacio', action: 'Desplaza la página de la vista previa' },
          { keys: '← →', action: 'Desplaza la vista previa en horizontal cuando desborda' },
        ],
      },
      visualBlocks: {
        title: 'Diagramas y gráficos',
        summary: 'Dibuja con texto: Mermaid, Markmap, gráficos.',
        intro:
          'Tres bloques cercados convierten texto simple en imágenes renderizadas en vivo en la vista previa e incrustadas como figuras en cada PDF exportado.',
        bullets: [
          '`mermaid` dibuja diagramas de flujo, secuencia, clases y estados.',
          '`markmap` convierte un esquema de títulos en un mapa mental.',
          '`chart` toma un pequeño bloque JSON (barras, líneas, áreas, tarta) y lo dibuja con la paleta de la app.',
          'Inserta una plantilla lista desde la barra de acciones rápidas; los bloques inválidos muestran un error claro en lugar de romper la página.',
        ],
        snippetLabel: 'Tres bloques para copiar',
        snippet: `## Diagramma

\`\`\`mermaid
flowchart LR
  A[Idea] --> B[Bozza]
  B --> C[Revisione]
  C --> D[PDF]
\`\`\`

## Mappa mentale

\`\`\`markmap
# Progetto
## Ricerca
## Scrittura
### Capitoli
## Pubblicazione
\`\`\`

## Grafico

\`\`\`chart
{
  "kind": "chart",
  "chartType": "bar",
  "title": "Parole per capitolo",
  "xKey": "capitolo",
  "yKeys": ["parole"],
  "data": [
    { "capitolo": "1", "parole": 1200 },
    { "capitolo": "2", "parole": 1850 },
    { "capitolo": "3", "parole": 940 }
  ]
}
\`\`\``,
      },
      exportPdf: {
        title: 'Exportar a PDF',
        summary: 'Dos perfiles, una página A4.',
        intro:
          'El botón Exportar produce un documento A4 real, totalmente sin conexión, con el runtime incluido. Nada se recorta y el archivo coincide con lo que muestra la vista previa.',
        bullets: [
          'Tipográfico (LuaLaTeX): composición de libro con microtipografía, código con saltos, tablas adaptativas y márgenes de encuadernación espejados.',
          'Web/impresión (WeasyPrint): el gemelo impreso de la página de vista previa — misma escala tipográfica, espaciado, colores y fuentes.',
          'Las tablas anchas se ajustan a la columna, las palabras largas y las URL saltan de línea, el código nunca se sale de la hoja, los encabezados de tabla se repiten entre páginas.',
          'Los bloques Mermaid, Markmap y chart se incrustan como imágenes; la fuente de escritura elegida se usa para cuerpo, títulos y código.',
        ],
      },
      typography: {
        title: 'Tipografía, tema y zoom',
        summary: 'Haz tuya la página sin salir de ella.',
        intro:
          'Doku incluye 24 familias de fuentes de código abierto, tres temas más una paleta personalizada y zoom de interfaz del 75% al 150%.',
        bullets: [
          'Elige la fuente de escritura en Preferencias: se aplica a la interfaz, el editor, la vista previa y la exportación PDF.',
          'El modo de accesibilidad cambia a OpenDyslexic, Atkinson Hyperlegible o Lexend para una lectura sin esfuerzo.',
          'Los temas claro, oscuro y del sistema siguen al SO; el tema personalizado permite fijar cada color de la interfaz.',
          'Los colores del contenido (enlaces, títulos, código, citas) se ajustan desde la barra de acciones rápidas y se restablecen con un clic.',
        ],
      },
      workspace: {
        title: 'Espacio de trabajo, paneles y datos',
        summary: 'Dónde viven archivos y estado.',
        intro:
          'La barra izquierda es un explorador en vivo de la carpeta actual; la derecha muestra métricas, documentos recientes y estado de sesión. Todo se guarda en local.',
        bullets: [
          'Abre un archivo guardado para convertir la barra izquierda en un explorador: crea archivos y carpetas, expande directorios, salta entre documentos.',
          'Las pestañas recuerdan lo que estaba abierto; la sesión y el modo de vista se restauran en el siguiente inicio.',
          'El autoguardado protege los borradores; la insignia de estado del encabezado siempre indica si la página está guardada.',
          'Los datos viven en Documentos/Doku (o en AppUser junto al ejecutable en la versión portable para Windows).',
        ],
      },
      manual: {
        title: 'Manual Markdown',
        summary: 'Referencia italiana integrada firmada por Lorenzo DM.',
        intro:
          'Esta sección integra el manual Markdown completo en italiano proporcionado para Doku y lo presenta dentro del producto como referencia editorial de Lorenzo DM.',
        bullets: [
          'El manual se mantiene en italiano porque ese es el texto autoral integrado en el producto.',
          'Puedes copiar cualquier bloque de ejemplo y probarlo directamente dentro de Doku.',
          'La vista previa en vivo permite comparar inmediatamente la sintaxis y el resultado renderizado.',
        ],
        snippetLabel: 'Manual completo',
        snippet: `# Manual Markdown

Versión: 20201226  
Por Lorenzo DM

Esta ficha esencial parte del material de referencia de [Markdown Guide](https://www.markdownguide.org) y ha sido adaptada para un uso práctico dentro de Doku.

## Sumario

### Fundamentos

1. [Sintaxis básica](#sintaxis-basica)
2. [Títulos](#titulos)
3. [Negrita](#negrita)
4. [Cursiva](#cursiva)
5. [Bloque de cita](#bloque-de-cita)
6. [Listas](#listas)
7. [Código](#codigo)
8. [Línea de separación](#linea-de-separacion)
9. [Enlaces](#enlaces)
10. [Imágenes](#imagenes)

### Extensiones útiles

1. [Sintaxis extendida](#sintaxis-extendida)
2. [Notas al pie](#notas-al-pie)
3. [Tablas](#tablas)
4. [Superíndice y subíndice](#superindice-y-subindice)
5. [Bloques de código](#bloques-de-codigo)
6. [ID y enlaces a encabezados](#id-y-enlaces-a-encabezados)
7. [Texto resaltado](#texto-resaltado)
8. [Caracteres especiales](#caracteres-especiales)

## Sintaxis básica

Estos son los elementos definidos por el Markdown original de John Gruber. Son los que casi cualquier aplicación soporta.

## Títulos

Deja siempre un espacio entre \`#\` y el texto.

\`\`\`md
# Título 1
## Título 2
### Título 3
#### Título 4
##### Título 5
###### Título 6
\`\`\`

## Negrita

\`\`\`md
**texto en negrita**
\`\`\`

Resultado: **texto en negrita**

## Cursiva

\`\`\`md
_texto en cursiva_
*texto en cursiva*
\`\`\`

Resultado: _texto en cursiva_ o *texto en cursiva*

Combinaciones útiles:

\`\`\`md
_texto con **énfasis parcial**_
**_texto muy enfatizado_**
\`\`\`

## Bloque de cita

\`\`\`md
> Primer párrafo.
>
> Segundo párrafo.
\`\`\`

> Primer párrafo.
>
> Segundo párrafo.

## Listas

### Lista numerada

\`\`\`md
1. Primer elemento
2. Segundo elemento
    1. Primer subelemento
    2. Otro subelemento
3. Tercer elemento
\`\`\`

### Lista no numerada

\`\`\`md
- Primer elemento
- Segundo elemento
    - Subelemento
    - Otro subelemento
- Tercer elemento
\`\`\`

## Código

Para el código en línea usa el acento grave.

\`\`\`md
\`código\`
\`\`\`

Resultado: \`código\`

## Línea de separación

\`\`\`md
***
\`\`\`

***

Recuerda dejar una línea vacía después.

## Enlaces

\`\`\`md
[Liber Liber](https://www.liberliber.it)
<https://www.liberliber.it>
\`\`\`

## Imágenes

\`\`\`md
![texto descriptivo](immagini/image.jpg)
_esta es la leyenda_
\`\`\`

O una imagen en la web:

\`\`\`md
![Liber Liber](https://www.liberliber.it/online/wp-content/uploads/2017/03/logo_liberliber.png)
*Este es el logo de Liber Liber*
\`\`\`

## Sintaxis extendida

Muchas aplicaciones modernas soportan funciones adicionales además del Markdown básico.

## Notas al pie

\`\`\`md
Aquí tenemos la referencia a una nota[^1].

[^1]: Y esta es la nota.
\`\`\`

## Tablas

\`\`\`md
| izquierda | centro | derecha |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |
\`\`\`

| izquierda | centro | derecha |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |

## Superíndice y subíndice

\`\`\`md
X^2^
H~2~O
\`\`\`

Resultado esperado en renderizadores compatibles: X^2^ y H~2~O

## Bloques de código

\`\`\`\`md
\`\`\`
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
\`\`\`
\`\`\`\`

## ID y enlaces a encabezados

\`\`\`md
#### Título de ejemplo {#un-titulo}
[Ir al título](#un-titulo)
[Ir a un título normal](#titulo-clicable)
\`\`\`

## Texto resaltado

\`\`\`md
==Este es un texto resaltado==
\`\`\`

## Caracteres especiales

Cuando sea necesario, antepón una barra invertida:

\`\`\`md
\\\` \\* \\_ \\{ \\} \\[ \\] \\( \\) \\< \\> \\# \\+ \\. \\! \\|
\`\`\`

## Nota final

No todas las extensiones son soportadas por todos los convertidores, pero esta ficha cubre las formas más útiles para el trabajo editorial cotidiano dentro de Doku.`,
      },
    },
  },
};
