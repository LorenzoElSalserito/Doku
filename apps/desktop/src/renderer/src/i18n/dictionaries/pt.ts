import type { Dictionary } from '../keys.js';

export const pt: Dictionary = {
  app: {
    name: 'Doku',
    loading: 'Preparando o seu estúdio…',
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
    confirm: {
      title: 'Tudo pronto — abra o seu estúdio',
      subtitle: 'As suas preferências são guardadas neste dispositivo.',
      languageLabel: 'Idioma',
      themeLabel: 'Tema',
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
    projectPanelTitle: 'Uma secretária silenciosa para o seu manuscrito',
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
      'O documento selecionado já não está disponível. O Doku abriu um novo rascunho local e removeu a entrada obsoleta dos recentes.',
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
    fontLabel: 'Fonte de escrita',
    fontHint: 'Aplica-se ao editor e à pré-visualização usando fontes já instaladas neste sistema.',
    fontLoading: 'A carregar fontes do sistema…',
    fontDefault: 'Predefinição do Doku',
    fontLatexNotice: 'As fontes de sistema personalizadas não são incorporadas na exportação LuaLaTeX.',
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
  },
  info: {
    title: 'Doku',
    subtitle: 'Um estúdio editorial local para escrever em Markdown.',
    versionLabel: 'Versão',
    licenseLabel: 'Licença',
    local: 'Tudo fica neste dispositivo.',
    donations: 'Donativos',
    reportBug: 'Reportar um bug',
    close: 'Fechar',
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
