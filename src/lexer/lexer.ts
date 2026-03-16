import { Parse } from '../interfaces.js';
import { Tags, TagType, TemplateData } from './interfaces.js';

function templateLexer(rawExpression: string, tags: Tags, parse: Parse) {
  const { opening, closing } = tags;

  const tokens: TemplateData[] = [];

  let index = 0;
  let line = 1;

  const openingLength = opening.length;
  const closingLength = closing.length;

  const updatePosition = (char: string) => {
    if (char === '\n') line++;
  };

  while (index < rawExpression.length) {
    const openIndex = rawExpression.indexOf(opening, index);

    // Text after the last opening tag
    if (openIndex === -1) {
      break;
    }

    // advance position until openIndex
    while (index < openIndex) {
      updatePosition(rawExpression[index]);
      index++;
    }

    const blockLine = line;
    let cursor = openIndex + openingLength;

    // Guard: opening tag at end of string (template still being typed)
    if (cursor >= rawExpression.length) break;

    const parseOptions: Record<string, TagType> = {
      [parse.exec]: 'execute',
      [parse.raw]: 'raw',
      [parse.interpolate]: 'interpolate',
    };
    const mode = parseOptions[rawExpression[cursor].trim()] ?? null;

    if (mode !== null) {
      cursor++;
    }

    const contentStart = cursor;

    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let inLineComment = false;
    let inBlockComment = false;
    let escaped = false;

    while (cursor < rawExpression.length) {
      const char = rawExpression[cursor];
      const next = rawExpression[cursor + 1];

      updatePosition(char);

      if (escaped) {
        escaped = false;
        cursor++;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        cursor++;
        continue;
      }

      if (inLineComment) {
        if (char === '\n') inLineComment = false;
        cursor++;
        continue;
      }

      if (inBlockComment) {
        if (char === '*' && next === '/') {
          inBlockComment = false;
          cursor += 2;
          continue;
        }

        cursor++;
        continue;
      }

      if (!inSingle && !inDouble && !inBacktick) {
        if (char === '/' && next === '/') {
          inLineComment = true;
          cursor += 2;
          continue;
        }
        if (char === '/' && next === '*') {
          inBlockComment = true;
          cursor += 2;
          continue;
        }
      }

      if (!inDouble && !inBacktick && char === "'") {
        inSingle = !inSingle;
        cursor++;
        continue;
      }

      if (!inSingle && !inBacktick && char === '"') {
        inDouble = !inDouble;
        cursor++;
        continue;
      }

      if (!inSingle && !inDouble && char === '`') {
        inBacktick = !inBacktick;
        cursor++;
        continue;
      }

      if (
        !inSingle &&
        !inDouble &&
        !inBacktick &&
        !inLineComment &&
        !inBlockComment &&
        rawExpression.startsWith(closing, cursor)
      ) {
        break;
      }

      cursor++;
    }

    const content = rawExpression.slice(contentStart, cursor).trim();
    tokens.push({
      id: tokens.length + 1, // 1-based index
      type: mode,
      value: content,
      line: blockLine,
      startPos: contentStart,
      endPos: cursor,
    });

    index = cursor + closingLength;
  }

  return tokens;
}

export { templateLexer };
