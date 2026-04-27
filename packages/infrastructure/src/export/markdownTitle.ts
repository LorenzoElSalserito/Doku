export function extractMarkdownTitle(content: string): string | null {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line) {
      continue;
    }

    const atxHeading = line.match(/^#\s+(.+?)\s*#*$/);
    if (atxHeading?.[1]) {
      return atxHeading[1].trim();
    }

    const nextLine = lines[index + 1]?.trim();
    if (nextLine && (/^=+$/.test(nextLine) || /^-+$/.test(nextLine))) {
      return line;
    }

    return null;
  }

  return null;
}

export function shouldInjectPandocTitle(content: string, title: string | undefined): title is string {
  const normalizedTitle = title?.trim();
  if (!normalizedTitle) {
    return false;
  }

  return extractMarkdownTitle(content) !== normalizedTitle;
}
