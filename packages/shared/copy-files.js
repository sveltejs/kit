import { copy } from './src/utils/filesystem.js';

// copy handwritten d.ts files
copy('src', '.', { filter: (name) => !name.includes('.') || name.endsWith('d.ts') });
