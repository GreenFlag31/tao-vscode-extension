/**
 * TAO Template Formatter
 *
 * Handles:
 *  - Tag spacing: <%=expr%>  →  <%= expr %>
 *  - Execute tags on their own lines (multiple tags on one line = line break)
 *  - Indentation based on JS block structure (if / for / while / else / …)
 *  - Blank line normalization (max 1 consecutive blank line)
 */

export interface FormatOptions {
  /** Spaces per indent level (default: 2) */
  indentSize?: number;
  /** Indentation character (default: 'space') */
  indentChar?: 'space' | 'tab';
  /** Maximum consecutive blank lines kept (default: 1) */
  maxBlankLines?: number;
  /** Opening tag delimiter (default: '<%') */
  opening?: string;
  /** Closing tag delimiter (default: '%>') */
  closing?: string;
  /** Interpolate prefix (default: '=') */
  interpolatePrefix?: string;
  /** Raw output prefix (default: '~') */
  rawPrefix?: string;
}

type TokType = 'text' | 'execute' | 'interpolate' | 'raw';

interface Token {
  type: TokType;
  /** Trimmed inner content (no delimiters / prefix) */
  content: string;
  /** Full original source text of this token */
  full: string;
}

const DEFAULTS: Required<FormatOptions> = {
  indentSize: 2,
  indentChar: 'space',
  maxBlankLines: 1,
  opening: '<%',
  closing: '%>',
  interpolatePrefix: '=',
  rawPrefix: '~',
};

// ─── Tokenizer ────────────────────────────────────────────────────────────────

/**
 * Returns the index of `closing` inside `str`, skipping over string literals
 * and JS comments so that `%>` inside a string is not mistaken for a tag end.
 */
function findClose(str: string, closing: string): number {
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inBack = false;
  let inLine = false;
  let inBlock = false;
  let escaped = false;

  while (i <= str.length - closing.length) {
    const c = str[i];
    const n = str[i + 1] ?? '';

    if (escaped) {
      escaped = false;
      i++;
      continue;
    }
    if (c === '\\' && (inSingle || inDouble || inBack)) {
      escaped = true;
      i++;
      continue;
    }
    if (inLine) {
      if (c === '\n') inLine = false;
      i++;
      continue;
    }
    if (inBlock) {
      if (c === '*' && n === '/') {
        inBlock = false;
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inBack) {
      if (c === '/' && n === '/') {
        inLine = true;
        i += 2;
        continue;
      }
      if (c === '/' && n === '*') {
        inBlock = true;
        i += 2;
        continue;
      }
    }
    if (!inDouble && !inBack && c === "'") {
      inSingle = !inSingle;
      i++;
      continue;
    }
    if (!inSingle && !inBack && c === '"') {
      inDouble = !inDouble;
      i++;
      continue;
    }
    if (!inSingle && !inDouble && c === '`') {
      inBack = !inBack;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && !inBack && str.startsWith(closing, i)) return i;
    i++;
  }
  return -1;
}

/** Splits a template string into a flat list of text / tag tokens. */
function tokenize(
  template: string,
  openingTag: string,
  closingTag: string,
  interpolationPrefix: string,
  rawPrefix: string,
): Token[] {
  const tokens: Token[] = [];
  let rest = template;

  while (rest.length > 0) {
    const openingIndex = rest.indexOf(openingTag);

    if (openingIndex === -1) {
      tokens.push({ type: 'text', content: rest, full: rest });
      break;
    }

    if (openingIndex > 0) {
      const untilOpening = rest.slice(0, openingIndex);
      tokens.push({ type: 'text', content: untilOpening, full: untilOpening });
    }

    const afterOpen = rest.slice(openingIndex + openingTag.length);
    let type: TokType = 'execute';
    let prefixLen = 0;

    if (interpolationPrefix && afterOpen.startsWith(interpolationPrefix)) {
      type = 'interpolate';
      prefixLen = interpolationPrefix.length;
    } else if (rawPrefix && afterOpen.startsWith(rawPrefix)) {
      type = 'raw';
      prefixLen = rawPrefix.length;
    }

    const inner = afterOpen.slice(prefixLen);
    const ci = findClose(inner, closingTag);

    if (ci === -1) {
      // Malformed tag – treat everything remaining as plain text
      const leftover = rest.slice(openingIndex);
      tokens.push({ type: 'text', content: leftover, full: leftover });
      break;
    }

    const content = inner.slice(0, ci).trim();
    const tagLen = openingTag.length + prefixLen + ci + closingTag.length;
    tokens.push({ type, content, full: rest.slice(openingIndex, openingIndex + tagLen) });
    rest = rest.slice(openingIndex + tagLen);
  }

  return tokens;
}

// ─── Tag rendering ─────────────────────────────────────────────────────────────

/** Returns the normalised string for a tag token: `<prefix> content %>` */
function renderTag(
  tok: Token,
  opening: string,
  closing: string,
  ipre: string,
  rpre: string,
): string {
  if (tok.type === 'text') return tok.full;
  const prefix = tok.type === 'interpolate' ? ipre : tok.type === 'raw' ? rpre : '';
  return `${opening}${prefix} ${tok.content} ${closing}`;
}

// ─── Block classification ─────────────────────────────────────────────────────

interface BlockClass {
  blockOpen: boolean; // execute content ends with  {
  blockClose: boolean; // execute content starts with }  (and is not midBlock)
  midBlock: boolean; // } ... {  e.g. "} else {", "} else if (...) {"
}

function classify(content: string): BlockClass {
  const t = content.trim();
  const midBlock = /^\}.*\{$/.test(t);
  return {
    midBlock,
    blockClose: !midBlock && t.startsWith('}'),
    blockOpen: !midBlock && !t.startsWith('}') && t.endsWith('{'),
  };
}

// ─── Step 1 – put every tag on its own line when needed ──────────────────────

/**
 * Execute tags always get their own line.
 * Interpolate / raw tags are separated with a newline only when the text
 * between them and the previous tag is pure whitespace (i.e. no real HTML
 * content in between). This preserves `<p>Hello <%= name %></p>` as one line
 * while splitting `<%= a %> <%= b %>` onto separate lines.
 */
function separateTags(
  tokens: Token[],
  opening: string,
  closing: string,
  ipre: string,
  rpre: string,
): string {
  const parts: string[] = [];

  const ensureNlBefore = () => {
    const last = parts[parts.length - 1] ?? '';
    if (last !== '' && !last.endsWith('\n')) parts.push('\n');
  };

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok.type === 'text') {
      parts.push(tok.content);
      continue;
    }

    const rendered = renderTag(tok, opening, closing, ipre, rpre);

    if (tok.type === 'execute') {
      // Execute tags always live on their own line
      ensureNlBefore();
      parts.push(rendered);

      // Ensure \n after
      const next = tokens[i + 1];
      if (next) {
        const nextStr =
          next.type === 'text' ? next.content : renderTag(next, opening, closing, ipre, rpre);
        if (!nextStr.startsWith('\n')) parts.push('\n');
      }
    } else {
      // interpolate / raw: add newline only when directly adjacent to a
      // previous tag with only whitespace between them
      const prev = tokens[i - 1];
      if (prev) {
        if (prev.type !== 'text') {
          // tag immediately follows another tag, no text token in between
          ensureNlBefore();
        } else if (/^\s*$/.test(prev.content) && i >= 2 && tokens[i - 2].type !== 'text') {
          // whitespace-only text between two tags:
          // pop it and use ensureNlBefore to avoid a double \n when the
          // previous execute tag already pushed one.
          parts.pop();
          ensureNlBefore();
        }
      }
      parts.push(rendered);
    }
  }

  return parts.join('');
}

// ─── Step 2 – apply indentation ───────────────────────────────────────────────

/**
 * Returns true when `trimmed` is a line that contains only a single execute tag
 * and nothing else (so it may affect block depth).
 */
function isPureExecLine(
  trimmed: string,
  opening: string,
  ipre: string,
  rpre: string,
  closing: string,
): boolean {
  if (!trimmed.startsWith(opening)) return false;
  const afterOpen = trimmed.slice(opening.length);
  if (ipre && afterOpen.startsWith(ipre)) return false;
  if (rpre && afterOpen.startsWith(rpre)) return false;
  return trimmed.endsWith(closing);
}

function innerContent(trimmed: string, opening: string, closing: string): string {
  return trimmed.slice(opening.length, trimmed.length - closing.length).trim();
}

function applyIndentation(
  text: string,
  opening: string,
  closing: string,
  ipre: string,
  rpre: string,
  indentUnit: string,
  maxBlanks: number,
): string {
  const lines = text.split('\n');
  let depth = 0;
  const out: string[] = [];
  let blanks = 0;
  let skipBlanks = false;

  for (const raw of lines) {
    const trimmed = raw.trimStart();

    if (!trimmed) {
      blanks++;
      if (!skipBlanks && blanks <= maxBlanks) out.push('');
      continue;
    }
    blanks = 0;
    skipBlanks = false;

    if (isPureExecLine(trimmed, opening, ipre, rpre, closing)) {
      const inner = innerContent(trimmed, opening, closing);
      const cls = classify(inner);

      if (cls.midBlock) {
        // "} else {" – step out for this line, then step back in
        depth = Math.max(0, depth - 1);
        out.push(indentUnit.repeat(depth) + trimmed);
        depth++;
        skipBlanks = true;
      } else if (cls.blockClose) {
        depth = Math.max(0, depth - 1);
        out.push(indentUnit.repeat(depth) + trimmed);
      } else {
        out.push(indentUnit.repeat(depth) + trimmed);
        if (cls.blockOpen) {
          depth++;
          skipBlanks = true;
        }
      }
    } else {
      out.push(indentUnit.repeat(depth) + trimmed);
    }
  }

  // Drop trailing blank lines
  while (out.length > 0 && !out[out.length - 1].trim()) out.pop();

  return out.join('\n');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Format a TAO template string.
 *
 * @param template  Raw template source.
 * @param options   Optional formatting overrides.
 * @returns         Formatted template string.
 */
export function format(template: string, options: FormatOptions = {}): string {
  const definitiveOptions: Required<FormatOptions> = { ...DEFAULTS, ...options };
  const indentUnit =
    definitiveOptions.indentChar === 'tab' ? '\t' : ' '.repeat(definitiveOptions.indentSize);

  const tokens = tokenize(
    template,
    definitiveOptions.opening,
    definitiveOptions.closing,
    definitiveOptions.interpolatePrefix,
    definitiveOptions.rawPrefix,
  );
  const separated = separateTags(
    tokens,
    definitiveOptions.opening,
    definitiveOptions.closing,
    definitiveOptions.interpolatePrefix,
    definitiveOptions.rawPrefix,
  );

  return applyIndentation(
    separated,
    definitiveOptions.opening,
    definitiveOptions.closing,
    definitiveOptions.interpolatePrefix,
    definitiveOptions.rawPrefix,
    indentUnit,
    definitiveOptions.maxBlankLines,
  );
}
