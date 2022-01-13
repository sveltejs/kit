#!/usr/bin/env node
import { copy } from '../src/utils/filesystem.js';

const [src, dest] = process.argv.slice(2);

copy(src, dest);

console.log(`copied ${src} to ${dest}`);
