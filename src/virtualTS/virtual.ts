import * as vscode from 'vscode';
import path from 'path';
import { TemplateData } from '../lexer/interfaces.js';
import { toImportPath } from './helpers.js';
import { VIRTUAL_FILE_NAME } from './checker.js';
import { TsMapping } from './interfaces.js';

const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? process.cwd();
// Le chemin du fichier virtuel tel que vu par le LanguageService TypeScript
const virtualFilePath = path.join(workspaceFolder, VIRTUAL_FILE_NAME);

function createHeader(interfacePath: string, interfaceName: string) {
  return `import type { ${interfaceName} } from '${interfacePath}';

function __tao_render(ctx: ${interfaceName}) {
`;
}

function createFooter(): string {
  return '}';
}

/**
 * Extracts ctx property accesses from a template expression value.
 *
 * - Simple identifier or property chain: `name` → ['name'], `user.name` → ['user.name']
 * - Template literal: `\`hi ${name}\`` → ['name']
 * - Falls back to empty array for unrecognised expressions.
 */
function extractIdentifiers(value: string) {
  const trimmed = value.trim();

  // Simple identifier or property chain (e.g. "name", "user.name")
  if (/^[A-Za-z_$][\w$.]*$/.test(trimmed)) {
    return [trimmed];
  }

  // Extract ${...} contents from template literals
  const results: string[] = [];
  const templateVarRegex = /\$\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = templateVarRegex.exec(trimmed)) !== null) {
    results.push(...extractIdentifiers(m[1]));
  }

  return results;
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
  const mappings: TsMapping[] = [];

  for (const expr of expressions) {
    for (const ident of extractIdentifiers(expr.value)) {
      const line = `ctx.${ident};\n`;
      const tsStart = virtualTs.length + 'ctx.'.length;
      const tsEnd = tsStart + ident.length;

      mappings.push({
        exprId: expr.id,
        tsStart,
        tsEnd,
      });

      virtualTs += line;
    }
  }

  virtualTs += createFooter();

  return { virtualTs, mappings };
}

export { generateVirtualTs };
