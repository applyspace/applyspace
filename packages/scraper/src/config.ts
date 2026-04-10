import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');

export const COOKIES_DIR  = process.env.COOKIES_DIR ?? path.join(root, '.local', 'cookies');
export const OUTPUT_DIR   = process.env.DATA_DIR    ?? path.join(root, '.local', 'output');
export const SETTINGS_PATH = process.env.SETTINGS_PATH ?? path.join(root, 'apps', 'web', 'data', 'settings.json');
