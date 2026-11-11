// Makes `sync` use TypeScript 7 (installed as `typescript-7`) instead of TypeScript 6
import { load_typescript, set_typescript } from '../src/core/sync/typescript/index.js';

const facade = await load_typescript('typescript-7');
if (!facade) throw new Error('Could not load TypeScript 7 from typescript-7');

set_typescript(facade);
