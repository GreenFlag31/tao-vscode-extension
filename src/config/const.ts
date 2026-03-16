import { Options } from '../interfaces.js';

const VIRTUAL_FILE_NAME = '__tao_virtual__.ts';
const DEFAULT_EXTENSION = 'html';
const DEFAULT_OPENING = '<%';
const DEFAULT_CLOSING = '%>';

const DEFAULT_EXEC = '';
const DEFAULT_INTERPOLATE = '=';
const DEFAULT_RAW = '~';

const DEFAULT_VIEWS = 'src';

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
  views: DEFAULT_VIEWS,
};

export {
  DEFAULT_CLOSING,
  DEFAULT_EXEC,
  DEFAULT_EXTENSION,
  DEFAULT_INTERPOLATE,
  DEFAULT_OPENING,
  DEFAULT_OPTIONS,
  DEFAULT_RAW,
  DEFAULT_VIEWS,
  VIRTUAL_FILE_NAME,
};
