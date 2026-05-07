import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const srcRoot = join(projectRoot, 'src');
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx'] as const;

type RuntimeImportGraph = Map<string, string[]>;

function isSourceFile(pathname: string) {
  return sourceExtensions.includes(extname(pathname) as (typeof sourceExtensions)[number]);
}

function isTestFile(pathname: string) {
  return (
    pathname.includes('__tests__') ||
    pathname.includes('.test.') ||
    pathname.includes('.spec.')
  );
}

function walkSourceFiles(dir: string, entries: string[] = []) {
  for (const name of readdirSync(dir)) {
    const pathname = join(dir, name);
    const stats = statSync(pathname);

    if (stats.isDirectory()) {
      if (name === 'node_modules' || name === '.next' || name === '.open-next') {
        continue;
      }

      walkSourceFiles(pathname, entries);
      continue;
    }

    if (isSourceFile(pathname) && !isTestFile(pathname)) {
      entries.push(pathname);
    }
  }

  return entries;
}

function createSourceFile(pathname: string) {
  const source = readFileSync(pathname, 'utf8');
  const scriptKind = pathname.endsWith('x')
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;

  return ts.createSourceFile(
    pathname,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );
}

function hasUseClientDirective(pathname: string) {
  const sourceFile = createSourceFile(pathname);
  const [firstStatement] = sourceFile.statements;

  return (
    firstStatement !== undefined &&
    ts.isExpressionStatement(firstStatement) &&
    ts.isStringLiteral(firstStatement.expression) &&
    firstStatement.expression.text === 'use client'
  );
}

function hasServerOnlyImport(pathname: string) {
  return /import\s+['"]server-only['"]/.test(readFileSync(pathname, 'utf8'));
}

function resolveLocalImport(fromPath: string, specifier: string) {
  const isAliasImport = specifier.startsWith('@/');
  const isRelativeImport = specifier.startsWith('.');

  if (!isAliasImport && !isRelativeImport) {
    return null;
  }

  const basePath = isAliasImport
    ? join(srcRoot, specifier.slice(2))
    : resolve(fromPath, '..', specifier);

  const candidates = [
    basePath,
    ...sourceExtensions.map((extension) => `${basePath}${extension}`),
    ...sourceExtensions.map((extension) => join(basePath, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function isRuntimeImport(statement: ts.ImportDeclaration) {
  const clause = statement.importClause;

  if (!clause) {
    return true;
  }

  if (clause.isTypeOnly) {
    return false;
  }

  if (clause.name) {
    return true;
  }

  const namedBindings = clause.namedBindings;
  if (!namedBindings) {
    return false;
  }

  if (ts.isNamespaceImport(namedBindings)) {
    return true;
  }

  if (!ts.isNamedImports(namedBindings)) {
    return false;
  }

  return namedBindings.elements.some((element) => !element.isTypeOnly);
}

function buildRuntimeImportGraph(files: string[]) {
  const graph: RuntimeImportGraph = new Map();

  for (const pathname of files) {
    const sourceFile = createSourceFile(pathname);
    const runtimeImports: string[] = [];

    for (const statement of sourceFile.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !isRuntimeImport(statement)
      ) {
        continue;
      }

      const resolvedImport = resolveLocalImport(
        pathname,
        statement.moduleSpecifier.text
      );

      if (resolvedImport) {
        runtimeImports.push(resolvedImport);
      }
    }

    graph.set(pathname, runtimeImports);
  }

  return graph;
}

function findRuntimePathToServerOnlyModule(
  entryFile: string,
  graph: RuntimeImportGraph,
  serverOnlyFiles: Set<string>
) {
  const queue: Array<{ file: string; trail: string[] }> = [
    { file: entryFile, trail: [entryFile] },
  ];
  const visited = new Set([entryFile]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    if (current.file !== entryFile && serverOnlyFiles.has(current.file)) {
      return current.trail;
    }

    for (const dependency of graph.get(current.file) || []) {
      if (visited.has(dependency)) {
        continue;
      }

      visited.add(dependency);
      queue.push({
        file: dependency,
        trail: [...current.trail, dependency],
      });
    }
  }

  return null;
}

describe('client runtime module boundaries', () => {
  it('keeps runtime client dependency graphs away from server-only modules', () => {
    const sourceFiles = walkSourceFiles(srcRoot);
    const runtimeGraph = buildRuntimeImportGraph(sourceFiles);
    const clientEntries = sourceFiles.filter(hasUseClientDirective);
    const serverOnlyFiles = new Set(sourceFiles.filter(hasServerOnlyImport));

    const runtimeLeaks = clientEntries
      .map((entryFile) =>
        findRuntimePathToServerOnlyModule(entryFile, runtimeGraph, serverOnlyFiles)
      )
      .filter((trail): trail is string[] => trail !== null)
      .map((trail) => trail.map((pathname) => relative(projectRoot, pathname)));

    expect(runtimeLeaks).toEqual([]);
  });
});
