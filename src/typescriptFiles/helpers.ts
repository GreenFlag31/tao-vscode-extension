import { log } from 'console';
import * as vscode from 'vscode';

async function getTypescriptFiles() {
  const templates = await vscode.workspace.findFiles(`**/*.ts`, '**/node_modules/**');

  return templates.map((template) => template.path);
}

// support uniquement pour les interfaces pour le moment, pas de déf directe
// pas de support pour les templates définis par variable
async function extractTemplateInterfacesFromRender(fileName: string) {
  const typescriptFiles = await getTypescriptFiles();

  const interfaceToFilePath = new Map<string, string>();
  // uniquement besoin du nom de l'interface, soit définie dans le même fichier soit importée
  let interfaceName = '';

  for (const filePath of typescriptFiles) {
    const renderCallRegex = /\.render\s*<\s*([A-Za-z0-9_]*)\s*>\(['|"|`]([^'"`]+)['|"|`]/g;
    const uri = vscode.Uri.file(filePath);
    const bytes = await vscode.workspace.fs.readFile(uri);
    const content = new TextDecoder().decode(bytes);

    let match: RegExpExecArray | null;
    while ((match = renderCallRegex.exec(content)) !== null) {
      const [fullMatch, interfaceDef, templateName] = match;

      if (fileName.endsWith(templateName)) {
        interfaceName = interfaceDef;
        break;
      }
    }
  }

  if (!interfaceName) {
    log(`No interface found in render calls for template ${fileName}`);
    return;
  }

  const interfaceDefRegex = /(?:import\s+)?interface\s+([A-Za-z_][A-Za-z0-9_]*)\s*[{<]?/g;

  // for (const filePath of typescriptFiles) {

  //   const uri = vscode.Uri.file(filePath);
  //   const bytes = await vscode.workspace.fs.readFile(uri);
  //   const content = new TextDecoder().decode(bytes);

  //   let match: RegExpExecArray | null;
  //   interfaceDefRegex.lastIndex = 0;
  //   while ((match = interfaceDefRegex.exec(content)) !== null) {
  //     if (usedInterfaces.has(match[1]) && !interfaceToFilePath.has(match[1])) {
  //       interfaceToFilePath.set(match[1], filePath);
  //     }
  //   }
  // }

  return interfaceToFilePath;
}

export { getTypescriptFiles, extractTemplateInterfacesFromRender };
