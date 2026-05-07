export interface ContentFrontmatterQuoteIssue {
  key: string;
  line: number;
  value: string;
}

export function findUnsafeSingleQuotedFrontmatterValues(source: string) {
  const frontmatter = extractFrontmatter(source);

  if (!frontmatter) {
    return [];
  }

  const issues: ContentFrontmatterQuoteIssue[] = [];

  for (const [index, line] of frontmatter.split(/\r?\n/).entries()) {
    const entry = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);

    if (!entry) {
      continue;
    }

    const [, key, rawValue] = entry;
    const trimmedValue = rawValue.trim();

    if (
      trimmedValue.length < 2 ||
      !trimmedValue.startsWith("'") ||
      !trimmedValue.endsWith("'")
    ) {
      continue;
    }

    const value = trimmedValue.slice(1, -1);

    if (!hasUnescapedSingleQuote(value)) {
      continue;
    }

    issues.push({
      key,
      line: index + 2,
      value,
    });
  }

  return issues;
}

function extractFrontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  return match?.[1] ?? '';
}

function hasUnescapedSingleQuote(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "'") {
      continue;
    }

    if (value[index + 1] === "'") {
      index += 1;
      continue;
    }

    return true;
  }

  return false;
}
