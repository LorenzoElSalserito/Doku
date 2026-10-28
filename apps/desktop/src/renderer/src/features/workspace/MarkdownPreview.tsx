import MarkdownIt from 'markdown-it';
import markdownItFootnote from 'markdown-it-footnote';
import { Fragment, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { classifyCodeFence } from './visualBlocks/visualBlockParser.js';
import { VisualBlockView } from './visualBlocks/VisualBlockView.js';
import { A4_TABLE_WIDTH_EM, layoutTableColumns } from './tableColumnLayout.js';

export interface MarkdownPreviewVisualLabels {
  loading: string;
  fallback: string;
  errorTitle: string;
}

interface MarkdownPreviewProps {
  content: string;
  emptyLabel: string;
  sourcePath?: string;
  visualLabels?: MarkdownPreviewVisualLabels;
}

type Token = ReturnType<MarkdownIt['parse']>[number];
type StateCore = Parameters<Parameters<MarkdownIt['core']['ruler']['after']>[2]>[0];

const DEFAULT_VISUAL_LABELS: MarkdownPreviewVisualLabels = {
  loading: 'Loading visual block…',
  fallback: 'Visual block',
  errorTitle: 'Visual block error',
};

/**
 * The preview parses GitHub-flavoured Markdown with the same feature set the
 * PDF exports get from `pandoc --from=gfm-raw_html-implicit_figures`: tables,
 * task lists, strikethrough, autolinks and footnotes, no raw HTML. Rendering
 * stays in React so the preview keeps its class names, theme tokens and the
 * live visual blocks (Mermaid, Markmap, charts).
 */
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false }).use(
  // The plugin ships typings for an older @types/markdown-it; the runtime API is the same.
  markdownItFootnote as unknown as Parameters<MarkdownIt['use']>[0],
);
markdown.core.ruler.after('inline', 'doku_task_list', markTaskListItems);

/** Marks `- [ ]` / `- [x]` items the way pandoc does, keeping the box out of the text. */
function markTaskListItems(state: StateCore): void {
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token || token.type !== 'list_item_open') {
      continue;
    }
    const paragraph = tokens[index + 1];
    const inline = tokens[index + 2];
    if (!paragraph || paragraph.type !== 'paragraph_open' || !inline || inline.type !== 'inline') {
      continue;
    }
    const first = inline.children?.[0];
    if (!first || first.type !== 'text') {
      continue;
    }
    const match = /^\[([ xX])\](?:\s+|$)/.exec(first.content);
    if (!match) {
      continue;
    }
    first.content = first.content.slice(match[0].length);
    token.attrSet('data-task', match[1] === ' ' ? 'open' : 'done');
  }
}

export function MarkdownPreview({
  content,
  emptyLabel,
  sourcePath,
  visualLabels,
}: MarkdownPreviewProps) {
  const labels = visualLabels ?? DEFAULT_VISUAL_LABELS;
  const tree = useMemo(() => (content.trim() ? buildTree(markdown.parse(content, {})) : null), [content]);

  if (!tree) {
    return <p className="markdown-preview__empty">{emptyLabel}</p>;
  }

  const context: RenderContext = { sourcePath, visualLabels: labels, key: 0 };
  return <div className="markdown-preview">{renderNodes(tree, context)}</div>;
}

/* ------------------------------------------------------------------ tree */

interface TreeNode {
  token: Token;
  children: TreeNode[];
}

function buildTree(tokens: Token[]): TreeNode[] {
  const root: TreeNode = { token: { type: 'root', nesting: 0 } as Token, children: [] };
  const stack: TreeNode[] = [root];

  for (const token of tokens) {
    const parent = stack[stack.length - 1]!;
    if (token.nesting === 1) {
      const node: TreeNode = { token, children: [] };
      parent.children.push(node);
      stack.push(node);
    } else if (token.nesting === -1) {
      if (stack.length > 1) {
        stack.pop();
      }
    } else if (token.type === 'inline') {
      parent.children.push({ token, children: buildTree(token.children ?? []) });
    } else {
      parent.children.push({ token, children: [] });
    }
  }

  return root.children;
}

/* ------------------------------------------------------------- rendering */

interface RenderContext {
  sourcePath?: string;
  visualLabels: MarkdownPreviewVisualLabels;
  key: number;
}

function nextKey(context: RenderContext, prefix: string): string {
  context.key += 1;
  return `${prefix}-${context.key}`;
}

function renderNodes(nodes: TreeNode[], context: RenderContext): ReactNode[] {
  return nodes.map((node) => renderNode(node, context));
}

function renderNode(node: TreeNode, context: RenderContext): ReactNode {
  const { token, children } = node;
  const key = nextKey(context, token.type);

  switch (token.type) {
    case 'inline':
      return <Fragment key={key}>{renderNodes(children, context)}</Fragment>;
    case 'text':
      return <Fragment key={key}>{token.content}</Fragment>;
    case 'softbreak':
      return <Fragment key={key}>{' '}</Fragment>;
    case 'hardbreak':
      return <br key={key} />;
    case 'strong_open':
      return <strong key={key}>{renderNodes(children, context)}</strong>;
    case 'em_open':
      return <em key={key}>{renderNodes(children, context)}</em>;
    case 's_open':
      return <del key={key}>{renderNodes(children, context)}</del>;
    case 'code_inline':
      return (
        <code key={key} className="markdown-preview__inline-code">
          {token.content}
        </code>
      );
    case 'link_open': {
      const href = token.attrGet('href') ?? '';
      const isHashLink = href.startsWith('#');
      return (
        <a
          key={key}
          className="markdown-preview__link"
          href={href}
          target={isHashLink ? undefined : '_blank'}
          rel={isHashLink ? undefined : 'noreferrer'}
        >
          {renderNodes(children, context)}
        </a>
      );
    }
    case 'image': {
      const alt = inlineText(children);
      return (
        <span key={key} className="markdown-preview__inline-image">
          {renderImage(alt, token.attrGet('src') ?? '', context.sourcePath)}
        </span>
      );
    }
    case 'footnote_ref': {
      const id = footnoteId(token);
      const label = String((token.meta?.id ?? 0) + 1);
      return (
        <sup key={key} className="markdown-preview__footnote-ref">
          <a href={`#fn-${id}`} id={`fnref-${id}${token.meta?.subId ? `-${token.meta.subId}` : ''}`}>
            {label}
          </a>
        </sup>
      );
    }

    case 'heading_open': {
      const level = Number(token.tag.slice(1)) || 1;
      const Tag = token.tag as keyof JSX.IntrinsicElements;
      const text = inlineText(children);
      return (
        <Tag
          key={key}
          id={slugifyHeading(text)}
          className={`markdown-preview__heading markdown-preview__heading--${level}`}
          tabIndex={-1}
        >
          {renderNodes(children, context)}
        </Tag>
      );
    }
    case 'paragraph_open': {
      const inner = renderNodes(children, context);
      if (token.hidden) {
        // Tight list items: pandoc's `Plain`, no paragraph box.
        return <Fragment key={key}>{inner}</Fragment>;
      }
      const only = children.length === 1 ? children[0] : null;
      const onlyImage = only?.children.length === 1 && only.children[0]?.token.type === 'image';
      if (onlyImage) {
        return (
          <figure key={key} className="markdown-preview__figure">
            {inner}
          </figure>
        );
      }
      return (
        <p key={key} className="markdown-preview__paragraph">
          {inner}
        </p>
      );
    }
    case 'blockquote_open':
      return (
        <blockquote key={key} className="markdown-preview__quote">
          {renderNodes(children, context)}
        </blockquote>
      );
    case 'bullet_list_open':
      return (
        <ul key={key} className="markdown-preview__list">
          {renderNodes(children, context)}
        </ul>
      );
    case 'ordered_list_open': {
      const start = token.attrGet('start');
      return (
        <ol
          key={key}
          className="markdown-preview__list markdown-preview__list--ordered"
          start={start ? Number(start) : undefined}
        >
          {renderNodes(children, context)}
        </ol>
      );
    }
    case 'list_item_open': {
      const task = token.attrGet('data-task');
      if (task) {
        return (
          <li key={key} className="markdown-preview__task" data-task={task}>
            <span
              className={`doku-task${task === 'done' ? ' doku-task--checked' : ''}`}
              aria-hidden="true"
            />
            <span className="markdown-preview__task-text">{renderNodes(children, context)}</span>
          </li>
        );
      }
      return <li key={key}>{renderNodes(children, context)}</li>;
    }
    case 'hr':
      return <hr key={key} className="markdown-preview__rule" />;
    case 'fence':
    case 'code_block': {
      const language = token.type === 'fence' ? token.info.trim().split(/\s+/)[0] || null : null;
      const source = token.content.replace(/\n$/, '');
      const visualBlock = classifyCodeFence({ language, source });
      if (visualBlock) {
        return (
          <div key={key} className={`markdown-preview__visual markdown-preview__visual--${visualBlock.kind}`}>
            <VisualBlockView
              block={visualBlock}
              loadingLabel={context.visualLabels.loading}
              fallbackLabel={context.visualLabels.fallback}
              errorTitle={context.visualLabels.errorTitle}
            />
          </div>
        );
      }
      return (
        <pre key={key} className="markdown-preview__code">
          <code>{source}</code>
        </pre>
      );
    }
    case 'table_open':
      return <TableBlock key={key} node={node} context={context} />;
    case 'thead_open':
      return <thead key={key}>{renderNodes(children, context)}</thead>;
    case 'tbody_open':
      return <tbody key={key}>{renderNodes(children, context)}</tbody>;
    case 'tr_open':
      return <tr key={key}>{renderNodes(children, context)}</tr>;
    case 'th_open':
    case 'td_open': {
      const Tag = token.tag as 'th' | 'td';
      const style = token.attrGet('style');
      const align = style?.includes('center') ? 'center' : style?.includes('right') ? 'right' : undefined;
      return (
        <Tag key={key} style={align ? { textAlign: align } : undefined}>
          {renderNodes(children, context)}
        </Tag>
      );
    }
    case 'footnote_block_open':
      return (
        <section key={key} className="markdown-preview__footnotes">
          <ol>{renderNodes(children, context)}</ol>
        </section>
      );
    case 'footnote_open': {
      const id = footnoteId(token);
      return (
        <li key={key} id={`fn-${id}`}>
          {renderNodes(children, context)}
        </li>
      );
    }
    case 'footnote_anchor': {
      const id = footnoteId(token);
      return (
        <a
          key={key}
          className="markdown-preview__footnote-back"
          href={`#fnref-${id}${token.meta?.subId ? `-${token.meta.subId}` : ''}`}
          aria-label="↩"
        >
          ↩
        </a>
      );
    }
    case 'html_block':
    case 'html_inline':
      // Raw HTML is disabled: these never appear, but keep the text if they do.
      return <Fragment key={key}>{token.content}</Fragment>;
    default:
      return <Fragment key={key}>{renderNodes(children, context)}</Fragment>;
  }
}

function footnoteId(token: Token): string {
  const id = Number(token.meta?.id ?? 0) + 1;
  return token.meta?.label ? String(token.meta.label) : String(id);
}

function inlineText(nodes: TreeNode[]): string {
  let text = '';
  for (const node of nodes) {
    const { token } = node;
    if (token.type === 'text' || token.type === 'code_inline') {
      text += token.content;
    } else if (token.type === 'softbreak' || token.type === 'hardbreak') {
      text += ' ';
    } else if (token.type === 'image') {
      text += inlineText(node.children);
    } else {
      text += inlineText(node.children);
    }
  }
  return text;
}

/* ---------------------------------------------------------------- tables */

interface TableBlockProps {
  node: TreeNode;
  context: RenderContext;
}

/**
 * Column widths come from the shared layout (see tableColumnLayout.ts): the
 * available width is measured so Split and Preview wrap identically to the
 * exported page, where it is the A4 text column.
 */
function TableBlock({ node, context }: TableBlockProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [availableEm, setAvailableEm] = useState(A4_TABLE_WIDTH_EM);

  const columns = useMemo(() => collectColumns(node), [node]);
  const layout = useMemo(() => layoutTableColumns(columns, availableEm), [columns, availableEm]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const measure = () => {
      const table = wrap.querySelector('table');
      const fontSize = table ? parseFloat(getComputedStyle(table).fontSize) : 0;
      const width = wrap.clientWidth;
      if (fontSize > 0 && width > 0) {
        const em = width / fontSize;
        setAvailableEm((current) => (Math.abs(current - em) < 0.05 ? current : em));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`markdown-preview__table-wrap markdown-preview__table-wrap--${layout.mode}`}
      data-table-mode={layout.mode}
    >
      <table className={`markdown-preview__table markdown-preview__table--${layout.mode}`}>
        <colgroup>
          {layout.fractions.map((fraction, index) => (
            <col key={`col-${index}`} style={{ width: `${(fraction * 100).toFixed(2)}%` }} />
          ))}
        </colgroup>
        {renderNodes(node.children, context)}
      </table>
    </div>
  );
}

function collectColumns(node: TreeNode): { header: string; cells: string[] }[] {
  const columns: { header: string; cells: string[] }[] = [];
  const visitRows = (section: TreeNode, isHeader: boolean) => {
    for (const row of section.children) {
      if (row.token.type !== 'tr_open') continue;
      row.children.forEach((cell, index) => {
        if (!columns[index]) {
          columns[index] = { header: '', cells: [] };
        }
        const text = inlineText(cell.children);
        if (isHeader) {
          if (text.length > columns[index]!.header.length) columns[index]!.header = text;
        } else {
          columns[index]!.cells.push(text);
        }
      });
    }
  };
  for (const section of node.children) {
    if (section.token.type === 'thead_open') visitRows(section, true);
    if (section.token.type === 'tbody_open') visitRows(section, false);
  }
  return columns;
}

/* ---------------------------------------------------------------- images */

function renderImage(alt: string, target: string, sourcePath?: string): ReactNode {
  const imageUrl = resolveAssetUrl(target, sourcePath);
  if (!imageUrl) {
    return <span className="markdown-preview__image-fallback">{alt || target}</span>;
  }

  return (
    <img
      className="markdown-preview__image"
      src={imageUrl}
      alt={alt || 'Image'}
      loading="lazy"
    />
  );
}

function resolveAssetUrl(target: string, sourcePath?: string): string | null {
  if (!target.trim()) {
    return null;
  }

  if (/^(https?:|file:|data:|blob:)/i.test(target)) {
    return target;
  }

  try {
    if (sourcePath) {
      return new URL(target, toFileUrl(sourcePath)).toString();
    }
    return target;
  } catch {
    return null;
  }
}

function toFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const prefixed = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `file://${encodeURI(prefixed)}`;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
