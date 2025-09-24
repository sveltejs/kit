import { DEV } from 'esm-env';
import process from 'node:process';

export const NULL_BODY_STATUS = [101, 103, 204, 205, 304];
export const IN_WEBCONTAINER = !!process.versions.webcontainer;
