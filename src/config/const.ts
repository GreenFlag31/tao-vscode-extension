import { Options } from '../interfaces.js';

const DEFAULT_EXTENSION = 'html';
const DEFAULT_OPENING = '<%';
const DEFAULT_CLOSING = '%>';

const DEFAULT_EXEC = '';
const DEFAULT_INTERPOLATE = '=';
const DEFAULT_RAW = '~';

const DEFAULT_VIEWS = process.cwd();

const DEFAULT_OPTIONS: Options = {
  extension: DEFAULT_EXTENSION,
  parse: {
    exec: DEFAULT_EXEC,
    interpolate: DEFAULT_INTERPOLATE,
    raw: DEFAULT_RAW,
  },
  tags: {
    opening: DEFAULT_OPENING,
    closing: DEFAULT_CLOSING,
  },
  // views: DEFAULT_VIEWS,
};

const INCLUDE = /include\(['"`]?.*['"`]?.*,?/;
const COMPLETE_INCLUDE = /include\(['"`]?.*['"`]?.*[^)]?$/;
const WHOLE_INCLUDE = /include\([^)]*\)?/d;
const TAG = /<%?$/;

export {
  DEFAULT_CLOSING,
  DEFAULT_EXEC,
  DEFAULT_EXTENSION,
  DEFAULT_INTERPOLATE,
  DEFAULT_OPENING,
  DEFAULT_OPTIONS,
  DEFAULT_RAW,
  DEFAULT_VIEWS,
  INCLUDE,
  COMPLETE_INCLUDE,
  WHOLE_INCLUDE,
};
