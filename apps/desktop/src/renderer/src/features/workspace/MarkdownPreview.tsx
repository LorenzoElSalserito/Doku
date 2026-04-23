import { Fragment, type ReactNode } from 'react';

interface MarkdownPreviewProps {
  content: string;
  emptyLabel: string;
  sourcePath?: string;
}

export function MarkdownPreview({ content, emptyLabel, sourcePath }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return <p className="markdown-preview__empty">{emptyLabel}</p>;
  }

  return <div className="markdown-preview">{renderBlocks(content, sourcePath)}</div>;
}

function renderBlocks(markdown: string, sourcePath?: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre key={`code-${blocks.length}`} className="markdown-preview__code">
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 1;
      const text = headingMatch[2] ?? '';
      const Tag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
      const headingId = slugifyHeading(text);
      blocks.push(
        <Tag
          key={`heading-${blocks.length}`}
          id={headingId}
          className={`markdown-preview__heading markdown-preview__heading--${level}`}
          tabIndex={-1}
        >
          {renderInline(text, sourcePath)}
        </Tag>,
      );
      index += 1;
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${blocks.length}`} className="markdown-preview__rule" />);
      index += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('>')) {
        quoteLines.push((lines[index] ?? '').replace(/^\s*>\s?/, ''));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${blocks.length}`} className="markdown-preview__quote">
          {renderBlocks(quoteLines.join('\n'), sourcePath)}
        </blockquote>,
      );
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*+]\s+/.test((lines[index] ?? '').trim())) {
        items.push((lines[index] ?? '').trim().replace(/^[-*+]\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="markdown-preview__list">
          {items.map((item, itemIndex) => (
            <li key={`${itemIndex}-${item}`}>{renderInline(item, sourcePath)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test((lines[index] ?? '').trim())) {
        items.push((lines[index] ?? '').trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="markdown-preview__list markdown-preview__list--ordered">
          {items.map((item, itemIndex) => (
            <li key={`${itemIndex}-${item}`}>{renderInline(item, sourcePath)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const imageOnlyMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
    if (imageOnlyMatch) {
      blocks.push(
        <figure key={`figure-${blocks.length}`} className="markdown-preview__figure">
          {renderImage(imageOnlyMatch[1] ?? '', imageOnlyMatch[2] ?? '', sourcePath)}
        </figure>,
      );
      index += 1;
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index] ?? '';
      const candidateTrimmed = candidate.trim();
      if (
        !candidateTrimmed ||
        candidateTrimmed.startsWith('```') ||
        candidateTrimmed.startsWith('>') ||
        /^#{1,6}\s+/.test(candidateTrimmed) ||
        /^[-*_]{3,}$/.test(candidateTrimmed) ||
        /^[-*+]\s+/.test(candidateTrimmed) ||
        /^\d+\.\s+/.test(candidateTrimmed) ||
        /^!\[([^\]]*)\]\(([^)]+)\)$/.test(candidateTrimmed)
      ) {
        break;
      }
      paragraphLines.push(candidateTrimmed);
      index += 1;
    }

    blocks.push(
      <p key={`p-${blocks.length}`} className="markdown-preview__paragraph">
        {renderInline(paragraphLines.join(' '), sourcePath)}
      </p>,
    );
  }

  return blocks;
}

function renderInline(text: string, sourcePath?: string): ReactNode[] {
  const tokens = text
    .split(/(!\[[^\]]*\]\([^)]+\)|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter(Boolean);

  return tokens.map((token, index) => {
    const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(token);
    if (imageMatch) {
      return (
        <span key={`image-inline-${index}`} className="markdown-preview__inline-image">
          {renderImage(imageMatch[1] ?? '', imageMatch[2] ?? '', sourcePath)}
        </span>
      );
    }

    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={`code-${index}`} className="markdown-preview__inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }

    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const isHashLink = href.startsWith('#');
      return (
        <a
          key={`link-${index}`}
          className="markdown-preview__link"
          href={href}
          target={isHashLink ? undefined : '_blank'}
          rel={isHashLink ? undefined : 'noreferrer'}
        >
          {label}
        </a>
      );
    }

    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={`strong-${index}`}>{token.slice(2, -2)}</strong>;
    }

    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={`em-${index}`}>{token.slice(1, -1)}</em>;
    }

    const withLineBreaks = token.split(/( {2})/g);
    return (
      <Fragment key={`text-${index}`}>
        {withLineBreaks.map((part, partIndex) =>
          part === '  ' ? <br key={`br-${partIndex}`} /> : <Fragment key={`frag-${partIndex}`}>{part}</Fragment>,
        )}
      </Fragment>
    );
  });
}

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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
