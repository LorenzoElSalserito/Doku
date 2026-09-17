import type { Dictionary } from '../keys.js';

export const pt: Dictionary = {
  app: {
    name: 'Doku',
    loading: 'A abrir a área de trabalho…',
    errorTitle: 'Algo correu mal.',
    unknownError: 'Erro desconhecido',
    skipToEditor: 'Saltar para o editor',
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
    lightDescription: 'Warm Ivory — tom editorial diurno com acento azul',
    dark: 'Escuro',
    darkDescription: 'Deep Slate — tom suave com acento azul',
    custom: 'Personalizado',
    customDescription: 'Uma paleta editorial definida por você',
    system: 'Sistema',
    systemDescription: 'Acompanha as preferências do sistema',
  },
  wizard: {
    eyebrow: 'Bem-vindo ao Doku',
    steps: {
      language: 'Idioma',
      theme: 'Tema',
      font: 'Fonte',
      confirm: 'Pronto',
    },
    language: {
      title: 'Escolha o seu idioma',
      subtitle: 'O Doku falará com você no idioma que preferir. Pode mudar a qualquer momento.',
    },
    theme: {
      title: 'Escolha a atmosfera',
      subtitle: 'Duas identidades editoriais no mesmo nível. A pré-visualização atualiza ao vivo.',
      previewHeading: 'Uma página digna de cuidado',
      previewBody:
        'O Doku trata a página como o coração do seu ofício. Cada superfície, cada espaço e cada detalhe tipográfico foram afinados para manter as palavras em primeiro plano.',
    },
    font: {
      title: 'Escolha a fonte de escrita',
      subtitle:
        'Escolha a tipografia que o Doku usará na interface, editor, pré-visualização e exportação PDF.',
      previewLabel: 'Pré-visualização',
      sampleText:
        'Um parágrafo claro facilita ler, editar e exportar notas longas.',
    },
    confirm: {
      title: 'Tudo pronto — abra o seu estúdio',
      subtitle: 'As suas preferências são guardadas neste dispositivo.',
      languageLabel: 'Idioma',
      themeLabel: 'Tema',
      fontLabel: 'Fonte',
      nextSteps:
        'Depois do wizard, você entra diretamente na página. Guia e exportação continuam a crescer nas próximas milestones.',
    },
    actions: {
      back: 'Voltar',
      next: 'Continuar',
      finish: 'Entrar no Doku',
    },
  },
  workspace: {
    breadcrumbHome: 'Início',
    breadcrumbWorkspace: 'Workspace',
    untitledDocument: 'Documento sem título',
    statusLocal: 'Local-first',
    statusReady: 'Shell pronta',
    documentTitleLabel: 'Título do documento',
    documentTitlePlaceholder: 'Título do documento',
    leftPanelLabel: 'Painel esquerdo',
    rightPanelLabel: 'Painel direito',
    guide: 'Guia',
    export: 'Exportar',
    settings: 'Preferências',
    info: 'Sobre',
    fileMenu: {
      trigger: 'Ficheiro',
      newDocument: 'Novo documento',
      openFile: 'Abrir ficheiro…',
      recentHeading: 'Recentes',
      recentEmpty: 'Nenhum documento recente',
    },
    tabs: {
      label: 'Documentos abertos',
      close: 'Fechar documento',
      closeDirtyConfirm: 'Este documento tem alterações não salvas. Fechar mesmo assim?',
      missingDocumentFile: 'O ficheiro já não está disponível no disco.',
      reopenFromDisk: 'Reabrir do disco',
      scrollPrev: 'Rolar abas para a esquerda',
      scrollNext: 'Rolar abas para a direita',
    },
    quickActions: {
      toggleShow: 'Mostrar ações rápidas',
      toggleHide: 'Ocultar ações rápidas',
      barLabel: 'Ações rápidas Markdown',
      tableButton: 'Tabela',
      tableRows: 'Linhas',
      tableColumns: 'Colunas',
      tableInsert: 'Inserir tabela',
      h1: 'H1',
      h2: 'H2',
      bold: 'Negrito',
      italic: 'Itálico',
      link: 'Ligação',
      image: 'Imagem',
      bulletList: 'Pontos',
      orderedList: 'Numerada',
      checklist: 'Checklist',
      quote: 'Citação',
      inlineCode: 'Código inline',
      codeBlock: 'Bloco código',
      divider: 'Separador',
      mermaidDiagram: 'Diagrama',
      markmapMindmap: 'Mapa mental',
      chartBlock: 'Gráfico',
    },
    immersive: {
      enter: 'Modo imersivo',
      exit: 'Sair do modo imersivo',
    },
    contentColors: {
      button: 'Cores',
      title: 'Cores do conteúdo',
      link: 'Links',
      heading: 'Títulos',
      code: 'Blocos de código',
      quote: 'Citações',
      reset: 'Redefinir',
    },
    previewZoom: {
      label: 'Zoom da pré-visualização',
      zoomIn: 'Ampliar',
      zoomOut: 'Reduzir',
      reset: 'Redefinir zoom',
      fitWidth: 'Ajustar à largura',
      fitPage: 'Ajustar à altura',
    },
    previewInvert: {
      invert: 'Inverter as cores da pré-visualização',
      restore: 'Restaurar as cores da pré-visualização',
    },
    visualBlocks: {
      loading: 'A carregar bloco visual…',
      fallback: 'Bloco visual',
      errorTitle: 'Bloco visual inválido',
      mermaidLabel: 'Diagrama Mermaid',
      markmapLabel: 'Mapa mental Markmap',
      chartLabel: 'Gráfico Recharts',
    },
    workspaceExplorer: {
      title: 'Workspace',
      body: 'Os ficheiros da pasta atual ficam por perto para que possa navegar no projeto sem sair da página.',
      empty: 'Ainda não existem ficheiros visíveis nesta pasta.',
      draftHint: 'Guarde este rascunho para transformar o painel esquerdo num verdadeiro explorador de workspace.',
      openFolder: 'Pasta atual',
      newFile: 'Novo ficheiro',
      newFolder: 'Nova pasta',
      newFilePrompt: 'Nome do novo ficheiro Markdown',
      newFolderPrompt: 'Nome da nova pasta',
      createFileError: 'Não foi possível criar o ficheiro. Verifique o nome e tente novamente.',
      createFolderError: 'Não foi possível criar a pasta. Verifique o nome e tente novamente.',
      directory: 'Pasta',
      markdown: 'Ficheiro Markdown',
      asset: 'Asset',
      other: 'Ficheiro',
    },
    projectPanelEyebrow: 'Projeto',
    projectPanelTitle: 'A sua segunda mente',
    projectPanelBody:
      'Este lado vai acolher navegação, secções recentes e contexto do projeto. Por agora define ritmo, hierarquia e respiração.',
    projectPanelMeta: 'A largura do painel já permanece entre sessões.',
    outlineTitle: 'Placeholder de estrutura',
    outlineBody: 'Títulos, estrutura e saltos rápidos estão disponíveis aqui para navegar pelo conteúdo sem perder o contexto.',
    notesTitle: 'Placeholder de contexto',
    notesBody: 'Notas, metadados e contexto editorial podem viver deste lado sem roubar foco da página.',
    previewTitle: 'Placeholder de preview',
    previewBody: 'Exportações, verificações de estilo e ajudas de leitura chegarão aqui gradualmente.',
    editorEyebrow: 'Área de escrita',
    editorTitle: 'O editor chega no próximo sprint',
    editorBody:
      'Esta shell estabelece as proporções, transições e calma necessárias para o verdadeiro workspace Markdown.',
    editorHint: 'Próximo sprint: Monaco, abrir/guardar e a primeira página editável.',
    editorLoading: 'A preparar a página…',
    editorErrorTitle: 'Não foi possível carregar o documento',
    editorErrorBody: 'Verifique o caminho do ficheiro ou volte a abri-lo a partir do launcher.',
    missingDocumentNotice:
      'O documento selecionado já não está disponível. O Doku manteve a aba aberta e removeu a entrada obsoleta dos recentes.',
    save: 'Guardar',
    saveAs: 'Guardar como',
    writeMode: 'Escrever',
    previewMode: 'Pré-visualizar',
    splitMode: 'Split',
    previewEyebrow: 'Pré-visualização',
    previewEmpty: 'Comece a escrever e a pré-visualização editorial aparecerá aqui.',
    imageDropzoneEyebrow: 'Largar imagem',
    imageDropzoneTitle: 'Largue a imagem para a importar para este documento.',
    imageImportSuccess: 'Imagem adicionada: {{fileName}}',
    imageImportSaveFirst: 'Guarde o documento antes de importar imagens.',
    imageImportUnsupported: 'Este formato de imagem não é suportado.',
    imageImportMissingSource: 'A imagem selecionada já não está disponível.',
    imageImportAllocationFailed: 'O Doku não conseguiu reservar um caminho local limpo para a imagem.',
    savedStatus: 'Guardado',
    dirtyStatus: 'Alterações por guardar',
    savingStatus: 'A guardar…',
    errorStatus: 'Erro ao guardar',
    savedAtLabel: 'Último guardado',
    autosaveLabel: 'Autosave ativo',
    draftLabel: 'Rascunho',
    fileLabel: 'Ficheiro Markdown',
    wordCountLabel: 'Palavras',
    charCountLabel: 'Caracteres',
    recentDocumentsTitle: 'Documentos recentes',
    recentDocumentsBody: 'Volte rapidamente às páginas em que mexeu mais recentemente.',
    sessionTitle: 'Sessão atual',
    sessionBody: 'Uma leitura rápida do estado de gravação, da vista ativa e do estado local do documento.',
    sessionUpdatedLabel: 'Atualizado',
    sessionViewModeLabel: 'Vista',
    sessionStorageLabel: 'Armazenamento',
    sessionStorageDraft: 'Rascunho local',
    sessionStorageFile: 'Ficheiro ligado',
    untitledPlaceholderBody: 'Uma página em branco, pronta para a primeira linha.',
    leftPanelToggleCollapse: 'Fechar painel esquerdo',
    leftPanelToggleExpand: 'Abrir painel esquerdo',
    rightPanelToggleCollapse: 'Fechar painel direito',
    rightPanelToggleExpand: 'Abrir painel direito',
    resizeLeftPanel: 'Redimensionar painel esquerdo',
    resizeRightPanel: 'Redimensionar painel direito',
  },
  settings: {
    title: 'Preferências',
    subtitle: 'Tudo fica neste dispositivo.',
    languageLabel: 'Idioma',
    languageHint: 'Aplicado de imediato, sem reinício.',
    themeLabel: 'Tema',
    themeHint: 'Claro, escuro ou seguindo o sistema.',
    zoomLabel: 'Zoom da app',
    zoomHint: 'Dimensiona toda a interface sem alterar a fonte Doku selecionada.',
    restartNotice: 'Reinicie o Doku para aplicar as alteracoes visuais corretamente.',
    fontLabel: 'Tipografia',
    fontHint: 'Cada seletor usa o catalogo completo de fontes Doku definido em FONTS.md.',
    fontLoading: 'A carregar fontes do sistema…',
    fontDefault: 'Predefinição do Doku',
    fontLatexNotice: 'A exportacao PDF recebe as fontes Doku selecionadas para texto e codigo.',
    fontProfileLabel: 'Configuracao de fontes',
    fontUiLabel: 'UI',
    fontPdfLabel: 'PDF e pre-visualizacao',
    fontMonoLabel: 'Codigo',
    fontAccessibilityLabel: 'Acessibilidade',
    fontAccessibilityMode: 'Usar a fonte acessivel na interface e na area de escrita',
    fontProfiles: {
      professional: 'Profissional',
      allPurpose: 'Versatil',
    },
    openDefaultApps: 'Abrir preferências de apps predefinidas',
    defaultAppsHint: 'Também pode configurar o Doku como app predefinida para ficheiros .md nas definições do sistema.',
    uninstallPreparationLabel: 'Preparação para desinstalação',
    uninstallPreparationButton: 'Preparação para desinstalação',
    uninstallPreparationWorking: 'A limpar…',
    uninstallPreparationHint:
      'Elimina definições, gravações automáticas, logs e dados locais do Doku, e depois fecha a app. Use antes de desinstalar.',
    uninstallPreparationConfirm:
      'Eliminar definitivamente todos os dados de utilizador do Doku e fechar a app?',
    customThemeOpen: 'Editar tema personalizado',
    customThemeHint: 'Ajuste os tokens centrais da paleta e aplique-os ao Doku.',
    close: 'Concluído',
    customTheme: {
      title: 'Tema personalizado',
      subtitle: 'Crie a sua própria paleta editorial e aplique-a sem reiniciar a aplicação.',
      reset: 'Repor',
      apply: 'Aplicar',
      close: 'Fechar',
      modeLabel: 'Base do tema',
      previewLabel: 'Pré-visualização',
      fields: {
        base: 'Base',
        surface: 'Surface',
        elevated: 'Elevated',
        accent: 'Accent',
        accentSoft: 'Accent soft',
        textPrimary: 'Texto principal',
        textSecondary: 'Texto secundário',
        border: 'Borda',
        focusRing: 'Focus ring',
      },
    },
  },
  defaultAppPrompt: {
    title: 'Definir o Doku como app predefinida para ficheiros .md',
    subtitle: 'O Doku apenas abre as preferências do sistema. Não altera nada em silêncio.',
    openPreferences: 'Abrir preferências do sistema',
    notNow: 'Agora não',
    dontAskAgain: 'Nao perguntar novamente',
    linuxHint: 'No Linux, o caminho exato depende do ambiente de trabalho usado.',
  },
  exportDialog: {
    title: 'Exportar PDF',
    subtitle: 'Escolha o perfil PDF mais adequado ao documento e gere-o localmente.',
    profileLabel: 'Perfil PDF',
    profiles: {
      lualatex: {
        label: 'Tipográfico',
        title: 'PDF tipográfico',
        description:
          'Mais editorial e mais próximo da página impressa. Ideal quando contam hierarquia, ritmo serif e tom de livro.',
      },
      weasy: {
        label: 'Web/impressão',
        title: 'PDF estilo web',
        description:
          'Mais próximo de HTML e print CSS. Útil quando quer uma página moderna, mais parecida com o browser.',
      },
    },
    documentLabel: 'Documento',
    outputLabel: 'Caminho de saída',
    outputHint: 'O Doku está a preparar o PDF e a guardá-lo no destino escolhido.',
    confirm: 'Exportar PDF',
    exporting: 'A exportar…',
    close: 'Fechar',
    successTitle: 'Exportação concluída',
    successBody: 'O PDF foi gerado com sucesso neste caminho.',
    errorTitle: 'Falha na exportação',
    errorGeneric: 'A exportação PDF falhou antes de gerar o ficheiro.',
    resultEngineLabel: 'Perfil usado',
    capturing: 'A renderizar diagramas e gráficos para o PDF…',
    visualNote: 'Diagramas Mermaid, mapas Markmap e gráficos são incorporados como imagens, exatamente como a pré-visualização os mostra.',
    a4Note: 'Folha A4, margens de encadernação espelhadas, números de página: o PDF corresponde à página da pré-visualização.',
  },
  info: {
    title: 'Doku',
    subtitle: 'A sua segunda mente',
    versionLabel: 'Versão',
    licenseLabel: 'Licença',
    local: 'Tudo fica neste dispositivo.',
    donations: 'Donativos',
    support: {
      title: 'Apoie o Doku',
      body: 'O Doku é gratuito, open source e vive apenas no seu dispositivo. Uma doação mantém-no assim e financia as próximas funcionalidades.',
      cta: 'Apoie-me com uma doação',
      note: 'Página PayPal segura, abre no navegador.',
    },
    reportBug: 'Reportar um bug',
    close: 'Fechar',
  },
  fontCatalog: {
    use: {
      'Inter': 'Interfaces modernas e apps de desktop',
      'Roboto': 'Texto de interface de uso geral',
      'Open Sans': 'Apps profissionais e documentos',
      'IBM Plex Sans': 'Software empresarial e textos de produto',
      'Ubuntu': 'Notas de desktop com tom amigável',
      'Source Sans 3': 'Documentos longos e interfaces',
      'Work Sans': 'Títulos no ecrã e interface',
      'Nunito': 'Notas informais de tom suave',
      'Manrope': 'Interfaces minimalistas e painéis',
      'Source Serif 4': 'Relatórios, manuais, PDF profissionais',
      'Merriweather': 'Páginas impressas e PDF legíveis',
      'Lora': 'Documentos editoriais de leitura longa',
      'Libre Baskerville': 'PDF clássicos e formais',
      'EB Garamond': 'Livros, ensaios, PDF clássicos',
      'Crimson Pro': 'Ficção e manuscritos',
      'Playfair Display': 'Títulos editoriais e capas',
      'JetBrains Mono': 'Código e dados técnicos',
      'Fira Code': 'Código com ligaduras',
      'Roboto Mono': 'Tabelas e código',
      'Source Code Pro': 'Código e documentação técnica',
      'Inconsolata': 'Código compacto e tabelas',
      'OpenDyslexic': 'Leitura facilitada para a dislexia',
      'Atkinson Hyperlegible': 'Alta legibilidade para todos',
      'Lexend': 'Leitura fluida, menos fadiga',
      'Noto Sans': 'Cobertura universal, qualquer idioma',
      'Montserrat': 'Títulos geométricos e cartazes',
      'Raleway': 'Títulos elegantes e capas',
      'Rubik': 'Interfaces arredondadas e amigáveis',
      'Karla': 'Grotesca compacta para notas',
      'Public Sans': 'Documentos institucionais neutros',
      'Outfit': 'Títulos geométricos modernos',
      'DM Sans': 'Interface e texto limpos',
      'Figtree': 'Texto de interface leve e amigável',
      'Noto Serif': 'Serif universal para qualquer idioma',
      'Literata': 'Leitura longa e e-books',
      'Bitter': 'Slab serif para leitura no ecrã',
      'Alegreya': 'Prosa literária e ensaios',
      'Vollkorn': 'Texto clássico e caloroso',
      'Newsreader': 'Tipografia editorial e jornalística',
      'Cormorant Garamond': 'Serif display para capas',
      'Red Hat Mono': 'Código compacto e legível',
      'Atkinson Hyperlegible Next': 'Legibilidade máxima, mais pesos',
    },
    preview: {
      sans: 'Escrita de interface clara',
      serif: 'Prosa editorial de leitura longa',
      monospace: 'Código, tabelas, metadados',
      accessibility: 'Leitura acessível e fluida',
    },
  },
  guideCenter: {
    title: 'Guide Center',
    subtitle: 'O Doku se explica sem tirar você da página.',
    searchLabel: 'Buscar no guia',
    searchPlaceholder: 'Markdown, painéis, atalhos…',
    navLabel: 'Seções do guia',
    noResults: 'Nenhuma seção corresponde à busca atual.',
    close: 'Fechar guia',
    copy: 'Copiar trecho',
    copied: 'Trecho copiado',
    livePreview: 'Prévia ao vivo',
    resultsCount: '{{count}} secções',
    outlineTitle: 'Índice',
    outlineBody: 'Salte para qualquer capítulo do manual.',
    shortcutKeysHeader: 'Teclas',
    shortcutActionHeader: 'Ação',
    sections: {
      quickStart: {
        title: 'Início rápido',
        summary: 'Pegue a página e comece a escrever.',
        intro:
          'O Doku foi pensado para reduzir o atrito inicial: abrir, escrever e guardar. A interface permanece calma e útil, sem exigir configuração antes do trabalho.',
        bullets: [
          'Use Ficheiro para criar um novo documento ou abrir um Markdown existente.',
          'Escreva no centro, acompanhe estado e modo de visualização no cabeçalho e deixe o autosave cuidar da rotina.',
          'Alterne entre Escrever, Pré-visualizar e Split conforme o momento de rascunho ou revisão.',
        ],
        snippetLabel: 'Trecho inicial',
        snippet: `# Título do documento

Escreva o parágrafo inicial com calma.

- Um ponto-chave
- Um detalhe útil
- Um fecho limpo`,
      },
      uiTour: {
        title: 'Tour da interface',
        summary: 'Entenda a shell em segundos.',
        intro:
          'A interface do Doku divide-se em zonas simples: cabeçalho leve, página central e painéis laterais opcionais. Cada parte tem uma função só.',
        bullets: [
          'O cabeçalho reúne ficheiro, modos de visualização, guardar, guia, exportação e preferências.',
          'O painel esquerdo mostra contexto do documento, métricas e estrutura rápida.',
          'O painel direito acolhe notas, apoio de leitura e superfícies secundárias.',
        ],
      },
      markdown: {
        title: 'Markdown básico',
        summary: 'As formas essenciais do dia a dia.',
        intro:
          'Para escrever bem em Markdown basta um pequeno conjunto de padrões recorrentes. O Doku mantém tudo legível tanto no editor quanto na pré-visualização.',
        bullets: [
          'Use `#` e `##` para construir uma hierarquia clara antes do texto mais longo.',
          'Listas e citações funcionam bem para notas, estruturas, revisões e material de apoio.',
          'Código inline e blocos cercados ajudam quando sintaxe ou caminhos precisam ficar exatos.',
        ],
        snippetLabel: 'Exemplo Markdown',
        snippet: `# Capítulo um

Um parágrafo com **ênfase** e \`código inline\`.

> Uma citação breve para definir o tom.

1. Primeira ideia
2. Segunda ideia
3. Fecho`,
      },
      shortcuts: {
        title: 'Atalhos e ritmo',
        summary: 'Menos rato, mais continuidade.',
        intro:
          'O Doku favorece um fluxo calmo. As ações frequentes ficam por perto, mas o teclado precisa sustentar todo o caminho principal.',
        bullets: [
          'Use Escape para fechar menus e diálogos quando quiser voltar imediatamente à página.',
          'Use Cmd/Ctrl+S para guardar e Cmd/Ctrl+Shift+S para abrir Guardar como.',
          'Guarde com regularidade mesmo com autosave ativo: o estado mostra sempre onde você está.',
          'Mantenha os painéis fechados durante a escrita e abra-os só para revisão ou estrutura.',
        ],
        items: [
          { keys: 'Ctrl/Cmd + S', action: 'Guardar o documento' },
          { keys: 'Ctrl/Cmd + Shift + S', action: 'Guardar como…' },
          { keys: 'Ctrl/Cmd + N', action: 'Novo documento vazio' },
          { keys: 'Ctrl/Cmd + W', action: 'Fechar o separador ativo' },
          { keys: 'Ctrl/Cmd + Tab', action: 'Separador seguinte (Shift para o anterior)' },
          { keys: 'Ctrl/Cmd + 1…9', action: 'Ir para o separador 1…9' },
          { keys: 'Esc', action: 'Fecha menus, diálogos e modo imersivo' },
          { keys: '↑ ↓ / PgUp PgDn / Home End / Espaço', action: 'Desloca a página de pré-visualização' },
          { keys: '← →', action: 'Desloca a pré-visualização na horizontal quando transborda' },
        ],
      },
      visualBlocks: {
        title: 'Diagramas e gráficos',
        summary: 'Desenhe com texto: Mermaid, Markmap, gráficos.',
        intro:
          'Três blocos delimitados transformam texto simples em imagens renderizadas ao vivo na pré-visualização e incorporadas como figuras em cada PDF exportado.',
        bullets: [
          '`mermaid` desenha fluxogramas, sequências, diagramas de classes e de estados.',
          '`markmap` transforma um esquema de títulos num mapa mental.',
          '`chart` recebe um pequeno bloco JSON (barras, linhas, áreas, circular) e desenha-o com a paleta da app.',
          'Insira um modelo pronto a partir da barra de ações rápidas; blocos inválidos mostram um erro claro em vez de quebrar a página.',
        ],
        snippetLabel: 'Três blocos para copiar',
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
        title: 'Exportar para PDF',
        summary: 'Dois perfis, uma página A4.',
        intro:
          'O botão Exportar produz um documento A4 real, totalmente offline, a partir do runtime incluído. Nada é cortado e o ficheiro corresponde ao que a pré-visualização mostra.',
        bullets: [
          'Tipográfico (LuaLaTeX): composição de livro com microtipografia, código com quebras, tabelas adaptativas e margens de encadernação espelhadas.',
          'Web/impressão (WeasyPrint): o gémeo impresso da página de pré-visualização — mesma escala tipográfica, espaçamentos, cores e fontes.',
          'Tabelas largas ajustam-se à coluna, palavras longas e URLs quebram, o código nunca sai da folha, os cabeçalhos das tabelas repetem-se entre páginas.',
          'Os blocos Mermaid, Markmap e chart são incorporados como imagens; a fonte de escrita escolhida é usada para corpo, títulos e código.',
        ],
      },
      typography: {
        title: 'Tipografia, tema e zoom',
        summary: 'Torne a página sua sem sair dela.',
        intro:
          'O Doku inclui 24 famílias de fontes open source, três temas mais uma paleta personalizada e zoom da interface de 75% a 150%.',
        bullets: [
          'Escolha a fonte de escrita nas Preferências: aplica-se à interface, ao editor, à pré-visualização e à exportação PDF.',
          'O modo de acessibilidade muda para OpenDyslexic, Atkinson Hyperlegible ou Lexend para uma leitura sem esforço.',
          'Os temas claro, escuro e do sistema seguem o SO; o tema personalizado permite definir cada cor da interface.',
          'As cores do conteúdo (ligações, títulos, código, citações) ajustam-se na barra de ações rápidas e repõem-se com um clique.',
        ],
      },
      workspace: {
        title: 'Área de trabalho, painéis e dados',
        summary: 'Onde vivem ficheiros e estado.',
        intro:
          'A barra esquerda é um explorador ao vivo da pasta atual; a direita mostra métricas, documentos recentes e estado da sessão. Tudo fica local.',
        bullets: [
          'Abra um ficheiro guardado para transformar a barra esquerda num explorador: crie ficheiros e pastas, expanda diretórios, salte entre documentos.',
          'Os separadores lembram o que estava aberto; a sessão e o modo de vista são repostos no próximo arranque.',
          'A gravação automática protege os rascunhos; o distintivo de estado no cabeçalho diz sempre se a página está guardada.',
          'Os dados vivem em Documentos/Doku (ou em AppUser junto ao executável na versão portable para Windows).',
        ],
      },
      manual: {
        title: 'Manual Markdown',
        summary: 'Referência completa integrada assinada por Lorenzo DM.',
        intro:
          'Esta secção integra o manual Markdown completo no produto e apresenta-o como referência editorial de Lorenzo DM.',
        bullets: [
          'A estrutura segue o manual completo com sintaxe base e sintaxe estendida.',
          'Cada bloco de exemplo pode ser copiado diretamente e testado dentro do Doku.',
          'A pré-visualização ao vivo mostra de imediato a diferença entre a sintaxe crua e o resultado renderizado.',
        ],
        snippetLabel: 'Manual completo',
        snippet: `# Manual Markdown

Versão: 20201226  
Por Lorenzo DM

Esta ficha essencial parte do material de referência do [Markdown Guide](https://www.markdownguide.org) e foi adaptada para uso prático dentro do Doku.

## Sumário

### Fundamentos

1. [Sintaxe base](#sintaxe-base)
2. [Títulos](#titulos)
3. [Negrito](#negrito)
4. [Itálico](#italico)
5. [Bloco de citação](#bloco-de-citacao)
6. [Listas](#listas)
7. [Código](#codigo)
8. [Linha de separação](#linha-de-separacao)
9. [Ligações](#ligacoes)
10. [Imagens](#imagens)

### Extensões úteis

1. [Sintaxe estendida](#sintaxe-estendida)
2. [Notas de rodapé](#notas-de-rodape)
3. [Tabelas](#tabelas)
4. [Expoente e índice](#expoente-e-indice)
5. [Blocos de código](#blocos-de-codigo)
6. [IDs e ligações para títulos](#ids-e-ligacoes-para-titulos)
7. [Texto realçado](#texto-realçado)
8. [Caracteres especiais](#caracteres-especiais)

## Sintaxe base

Estes são os elementos definidos pelo Markdown original de John Gruber. São os que quase todas as aplicações suportam.

## Títulos

Deixe sempre um espaço entre \`#\` e o texto.

\`\`\`md
# Título 1
## Título 2
### Título 3
#### Título 4
##### Título 5
###### Título 6
\`\`\`

## Negrito

\`\`\`md
**texto em negrito**
\`\`\`

Resultado: **texto em negrito**

## Itálico

\`\`\`md
_texto em itálico_
*texto em itálico*
\`\`\`

Resultado: _texto em itálico_ ou *texto em itálico*

Combinações úteis:

\`\`\`md
_texto com **ênfase parcial**_
**_texto muito enfatizado_**
\`\`\`

## Bloco de citação

\`\`\`md
> Primeiro parágrafo.
>
> Segundo parágrafo.
\`\`\`

> Primeiro parágrafo.
>
> Segundo parágrafo.

## Listas

### Lista numerada

\`\`\`md
1. Primeiro elemento
2. Segundo elemento
    1. Primeiro subelemento
    2. Outro subelemento
3. Terceiro elemento
\`\`\`

### Lista não numerada

\`\`\`md
- Primeiro elemento
- Segundo elemento
    - Subelemento
    - Outro subelemento
- Terceiro elemento
\`\`\`

## Código

Para código inline usa o acento grave backtick.

\`\`\`md
\`código\`
\`\`\`

Resultado: \`código\`

## Linha de separação

\`\`\`md
***
\`\`\`

***

Lembra-te de deixar uma linha vazia depois.

## Ligações

\`\`\`md
[Liber Liber](https://www.liberliber.it)
<https://www.liberliber.it>
\`\`\`

## Imagens

\`\`\`md
![texto descritivo](immagini/image.jpg)
_esta é a legenda_
\`\`\`

Ou uma imagem na web:

\`\`\`md
![Liber Liber](https://www.liberliber.it/online/wp-content/uploads/2017/03/logo_liberliber.png)
*Este é o logótipo da Liber Liber*
\`\`\`

## Sintaxe estendida

Muitas aplicações modernas suportam funcionalidades adicionais além do Markdown base.

## Notas de rodapé

\`\`\`md
Aqui temos a referência a uma nota[^1].

[^1]: E esta é a nota.
\`\`\`

## Tabelas

\`\`\`md
| esquerda | centro | direita |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |
\`\`\`

| esquerda | centro | direita |
| :--- | :---: | ---: |
| pippo | pluto | topolino |
| paperino | paperoga | paperone |

## Expoente e índice

\`\`\`md
X^2^
H~2~O
\`\`\`

Resultado esperado em renderizadores compatíveis: X^2^ e H~2~O

## Blocos de código

\`\`\`\`md
\`\`\`
{
  "firstName": "John",
  "lastName": "Smith",
  "age": 25
}
\`\`\`
\`\`\`\`

## IDs e ligações para títulos

\`\`\`md
#### Título de exemplo {#um-titulo}
[Ir para o título](#um-titulo)
[Ir para um título normal](#titulo-clicavel)
\`\`\`

## Texto realçado

\`\`\`md
==Este é um texto realçado==
\`\`\`

## Caracteres especiais

Quando necessário, coloca uma barra invertida antes dos símbolos:

\`\`\`md
\\\` \\* \\_ \\{ \\} \\[ \\] \\( \\) \\< \\> \\# \\+ \\. \\! \\|
\`\`\`

## Nota final

Nem todas as extensões são suportadas por todos os conversores, mas esta ficha cobre as formas mais úteis para o trabalho editorial quotidiano dentro do Doku.`,
      },
    },
  },
};
