import path from 'path';
import { TemplateData } from '../lexer/interfaces.js';
import { getWorkspaceFolder, toImportPath } from './helpers.js';
import { VIRTUAL_FILE_NAME } from './checker.js';
import { TsMapping } from './interfaces.js';

// Le chemin du fichier virtuel tel que vu par le LanguageService TypeScript
const virtualFilePath = path.join(getWorkspaceFolder(), VIRTUAL_FILE_NAME);

/**
 * IIEF function to be invisible to typescript, otherwise it is included in the functions propositions
 */
function createHeader(interfacePath: string, interfaceName: string) {
  return `import type { ${interfaceName} } from '${interfacePath}';

type __TaoData = { [K in keyof ${interfaceName} as ${interfaceName}[K] extends ((...args: any[]) => any) ? never : K]?: ${interfaceName}[K] };
type __TaoHelpers = { [K in keyof ${interfaceName} as ${interfaceName}[K] extends ((...args: any[]) => any) ? K : never]?: ${interfaceName}[K] };

declare function include(template: string, data?: __TaoData, helper?: __TaoHelpers): string;

((ctx: ${interfaceName}) => {
`;
}

function createFooter(): string {
  return '})(null!);\n';
}

/**
 * Extracts ctx property accesses from a template expression value.
 *
 * - Template literals : recurse into ${...} interpolations
 * - Pure literals (string, number, boolean, null, undefined) : ignored
 * - Everything else starting with an identifier or unary operator :
 *   returned as-is so TypeScript validates `ctx.${expr}` naturally
 */
function extractIdentifiers(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  // Template literal — recurse into ${...} interpolations
  if (trimmed.startsWith('`')) {
    const results: string[] = [];
    const re = /\$\{([^}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(trimmed)) !== null) results.push(...extractIdentifiers(m[1]));
    return results;
  }

  // Pure literals — no ctx reference
  if (
    /^(['"])[\s\S]*\1$/.test(trimmed) ||
    /^\d/.test(trimmed) ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    trimmed === 'null' ||
    trimmed === 'undefined'
  ) {
    return [];
  }

  // Any expression starting with an identifier or unary operator:
  // returned as-is, TypeScript will validate ctx.${expr} and report errors
  if (/^[A-Za-z_$!~]/.test(trimmed)) return [trimmed];

  return [];
}

/**
 * Scans all execute tokens and returns a set of locally-declared variable names.
 * Covered patterns:
 *   for (const x of ...)        → x
 *   for (const x in ...)        → x
 *   for (let i = 0; ...)        → i
 *   const/let/var x = ...       → x
 */
function collectLocalVars(expressions: TemplateData[]): Set<string> {
  const locals = new Set<string>();
  const ident = '[A-Za-z_$][A-Za-z0-9_$]*';
  const patterns = [
    new RegExp(`(?:const|let|var)\\s+(${ident})\\s+(?:of|in)\\s`), // for...of / for...in
    new RegExp(`(?:const|let|var)\\s+(${ident})\\s*=`), // const/let/var x =
    new RegExp(`for\\s*\\(\\s*(?:let|var)\\s+(${ident})\\s*=`), // for (let i = 0; …)
  ];

  for (const expr of expressions) {
    if (expr.type !== 'execute') continue;
    for (const re of patterns) {
      const m = re.exec(expr.value);
      if (m) locals.add(m[1]);
    }
  }

  return locals;
}

function generateVirtualTs(
  expressions: TemplateData[],
  interfacePath: string,
  interfaceName: string,
) {
  const relativeInterfacePath = toImportPath(virtualFilePath, interfacePath);
  let virtualTs = createHeader(relativeInterfacePath, interfaceName);
  const virtualTsMappings: TsMapping[] = [];

  const localVars = collectLocalVars(expressions);

  // Declare local variables so TypeScript knows they exist (type any — they
  // come from JS control structures in execute tags, not from the interface).
  for (const varName of localVars) {
    virtualTs += `let ${varName}: any;\n`;
  }

  for (const expr of expressions) {
    // Execute tags contain JS statements (for, if, const, …) that cannot be
    // meaningfully validated as ctx property accesses. Skip them entirely.
    if (expr.type === 'execute') continue;

    for (const ident of extractIdentifiers(expr.value)) {
      // include(...) is a template engine global — not a ctx property
      const isEngineGlobal = /^include\s*\(/.test(ident);
      // Variables declared in execute tags (for, const, …) are local — not ctx properties
      const isLocal = localVars.has(ident.split(/[.\[( ]/)[0]);
      const line = isEngineGlobal || isLocal ? `${ident};\n` : `ctx.${ident};\n`;
      const tsStart = virtualTs.length + (isEngineGlobal || isLocal ? 0 : 'ctx.'.length);
      const tsEnd = tsStart + ident.length;

      virtualTsMappings.push({
        exprId: expr.id,
        tsStart,
        tsEnd,
      });

      virtualTs += line;
    }
  }

  virtualTs += createFooter();

  return { virtualTs, virtualTsMappings };
}

export { generateVirtualTs };
