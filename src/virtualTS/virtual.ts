import path from 'path';
import { TemplateData } from '../lexer/interfaces.js';
import { getWorkspaceFolder, toImportPath } from './helpers.js';
import { VIRTUAL_FILE_NAME } from './checker.js';
import { TsMapping } from './interfaces.js';

// Le chemin du fichier virtuel tel que vu par le LanguageService TypeScript
const virtualFilePath = path.join(getWorkspaceFolder(), VIRTUAL_FILE_NAME);

/**
 * IIFE function to be invisible to typescript, otherwise it is included in the functions propositions
 */
function createHeader(interfacePath: string, interfaceName: string) {
  return `import type { ${interfaceName} } from '${interfacePath}';

declare function include(templatePath: string, dataOrHelpers?: Partial<${interfaceName}> & Record<string, unknown>): string;

((ctx: ${interfaceName}) => {
`;
}

function createFooter(): string {
  return '})(null!);\n';
}

/**
 * Extracts ctx property accesses from a template interpolate/raw expression value.
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

// ─── Execute tag transformation ───────────────────────────────────────────────

const JS_KEYWORDS = new Set([
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'return',
  'const',
  'let',
  'var',
  'function',
  'class',
  'new',
  'delete',
  'typeof',
  'instanceof',
  'in',
  'of',
  'null',
  'undefined',
  'true',
  'false',
  'void',
  'this',
  'super',
  'import',
  'export',
  'default',
  'try',
  'catch',
  'finally',
  'throw',
  'async',
  'await',
  'yield',
  'from',
  'as',
  'static',
  'get',
  'set',
]);

const JS_GLOBALS = new Set([
  'Math',
  'JSON',
  'Date',
  'Array',
  'Object',
  'String',
  'Number',
  'Boolean',
  'RegExp',
  'Error',
  'Promise',
  'Map',
  'Set',
  'Symbol',
  'BigInt',
  'Infinity',
  'NaN',
  'console',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURIComponent',
  'decodeURIComponent',
  'encodeURI',
  'decodeURI',
  'include',
]);

const DECL_KEYWORDS = new Set(['const', 'let', 'var']);

/**
 * Rewrites free identifiers in `expr` to `ctx.ident`, skipping:
 *  - JS keywords and built-in globals
 *  - locally declared variables (knownLocals + variables declared earlier in expr)
 *  - property accesses (identifiers directly preceded by '.')
 *  - content inside string literals (single, double, backtick with ${…} recursion)
 *
 * Also detects declaration positions (after const/let/var) and returns those
 * variable names as `newLocals` so the caller can register them.
 */
function prefixFreeIdentifiers(
  expr: string,
  knownLocals: Set<string>,
): { result: string; newLocals: string[] } {
  const newLocals: string[] = [];
  let result = '';
  let i = 0;
  const len = expr.length;
  let prevKeyword = ''; // last keyword token seen (kept across whitespace)

  while (i < len) {
    const ch = expr[i];

    // Whitespace — preserve prevKeyword so "const   x" works
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      result += ch;
      i++;
      continue;
    }

    // Single or double quoted string — copy verbatim
    if (ch === '"' || ch === "'") {
      prevKeyword = '';
      const close = ch;
      result += ch;
      i++;
      while (i < len) {
        const c = expr[i];
        result += c;
        if (c === '\\') {
          i++;
          if (i < len) {
            result += expr[i];
            i++;
          }
          continue;
        }
        if (c === close) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Template literal — copy verbatim, recurse into ${…}
    if (ch === '`') {
      prevKeyword = '';
      result += ch;
      i++;
      while (i < len) {
        const c = expr[i];
        if (c === '\\') {
          result += c;
          i++;
          if (i < len) {
            result += expr[i];
            i++;
          }
          continue;
        }
        if (c === '`') {
          result += c;
          i++;
          break;
        }
        if (c === '$' && expr[i + 1] === '{') {
          result += '${';
          i += 2;
          let depth = 1;
          let inner = '';
          while (i < len && depth > 0) {
            const ic = expr[i];
            if (ic === '{') depth++;
            else if (ic === '}') {
              depth--;
              if (depth === 0) break;
            }
            inner += ic;
            i++;
          }
          const sub = prefixFreeIdentifiers(inner, new Set([...knownLocals, ...newLocals]));
          result += sub.result;
          newLocals.push(...sub.newLocals);
          if (i < len) {
            result += '}';
            i++;
          }
          continue;
        }
        result += c;
        i++;
      }
      continue;
    }

    // Identifier
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < len && /[A-Za-z0-9_$]/.test(expr[j])) j++;
      const ident = expr.slice(i, j);
      i = j;

      const isDeclPosition = DECL_KEYWORDS.has(prevKeyword);
      prevKeyword = JS_KEYWORDS.has(ident) ? ident : '';

      if (isDeclPosition) {
        // This identifier is being declared — register as local, no ctx. prefix
        newLocals.push(ident);
        result += ident;
      } else {
        // Property access: find last non-whitespace char in result so far
        let lastNonWs = '';
        for (let k = result.length - 1; k >= 0; k--) {
          if (result[k] !== ' ' && result[k] !== '\t' && result[k] !== '\n') {
            lastNonWs = result[k];
            break;
          }
        }
        const allLocals = new Set([...knownLocals, ...newLocals]);
        if (
          lastNonWs !== '.' &&
          !JS_KEYWORDS.has(ident) &&
          !JS_GLOBALS.has(ident) &&
          !allLocals.has(ident)
        ) {
          result += `ctx.${ident}`;
        } else {
          result += ident;
        }
      }
      continue;
    }

    // Any other character — reset prevKeyword
    prevKeyword = '';
    result += ch;
    i++;
  }

  return { result, newLocals };
}

/**
 * Transforms a single execute-tag content into a valid TypeScript statement
 * by delegating entirely to prefixFreeIdentifiers.
 * Returns the transformed line and any new local variable names it introduces.
 */
function transformExecute(
  content: string,
  knownLocals: Set<string>,
): { line: string; newLocals: string[] } {
  const { result, newLocals } = prefixFreeIdentifiers(content.trim(), knownLocals);
  const r = result.trimEnd();
  const needsSemi = !r.endsWith(';') && !r.endsWith('{') && !r.endsWith('}');
  return { line: `${result}${needsSemi ? ';' : ''}\n`, newLocals };
}

function generateVirtualTs(
  expressions: TemplateData[],
  interfacePath: string,
  interfaceName: string,
) {
  const relativeInterfacePath = toImportPath(virtualFilePath, interfacePath);
  let virtualTs = createHeader(relativeInterfacePath, interfaceName);
  const virtualTsMappings: TsMapping[] = [];

  // knownLocals is accumulated in template order:
  // each for/const/let/var execute tag adds its declared variable so that subsequent
  // interpolate/raw tags and execute tags know not to prefix it with ctx.
  const knownLocals = new Set<string>();

  for (const expr of expressions) {
    if (expr.type === 'execute') {
      const tsStart = virtualTs.length;
      const { line, newLocals } = transformExecute(expr.value, knownLocals);
      virtualTs += line;
      const tsEnd = virtualTs.length - 1; // exclude trailing newline

      for (const local of newLocals) knownLocals.add(local);
      virtualTsMappings.push({ exprId: expr.id, tsStart, tsEnd });
      continue;
    }

    // interpolate / raw
    for (const ident of extractIdentifiers(expr.value)) {
      // include(...) is a template engine global — not a ctx property
      const isEngineGlobal = /^include\s*\(/.test(ident);
      // Variables declared in execute tags (for, const, …) are local — not ctx properties
      const isLocal = knownLocals.has(ident.split(/[.[(]/)[0]);
      const line = isEngineGlobal || isLocal ? `${ident};\n` : `ctx.${ident};\n`;
      const tsStart = virtualTs.length + (isEngineGlobal || isLocal ? 0 : 'ctx.'.length);
      const tsEnd = tsStart + ident.length;

      virtualTsMappings.push({ exprId: expr.id, tsStart, tsEnd });
      virtualTs += line;
    }
  }

  virtualTs += createFooter();

  return { virtualTs, virtualTsMappings };
}

export { generateVirtualTs };
