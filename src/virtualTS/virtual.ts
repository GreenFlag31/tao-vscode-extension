import path from 'path';
import { TemplateData } from '../lexer/interfaces.js';
import { getWorkspaceFolder, toImportPath } from './helpers.js';
import { VIRTUAL_FILE_NAME } from './checker.js';
import { TsMapping } from './interfaces.js';

// Le chemin du fichier virtuel tel que vu par le LanguageService TypeScript
const virtualFilePath = path.join(getWorkspaceFolder(), VIRTUAL_FILE_NAME);

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
 * @param expressions Les expressions extraites du template
 * Le diagnostic de TypeScript sera lié au mappings qui contient l'id de l'expression
 */
function generateVirtualTs(
  expressions: TemplateData[],
  interfacePath: string,
  interfaceName: string,
) {
  const relativeInterfacePath = toImportPath(virtualFilePath, interfacePath);
  let virtualTs = createHeader(relativeInterfacePath, interfaceName);
  const virtualTsMappings: TsMapping[] = [];

  for (const expr of expressions) {
    for (const ident of extractIdentifiers(expr.value)) {
      // include(...) is a template engine global — not a ctx property
      const isEngineGlobal = /^include\s*\(/.test(ident);
      const line = isEngineGlobal ? `${ident};\n` : `ctx.${ident};\n`;
      const tsStart = virtualTs.length + (isEngineGlobal ? 0 : 'ctx.'.length);
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
