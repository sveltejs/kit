import { DEV } from 'esm-env';
import process from 'node:process';

export const NULL_BODY_STATUS = [101, 103, 204, 205, 304];

export const IN_WEBCONTAINER =
	DEV &&
	!!process.versions.webcontainer &&
	// @ts-expect-error
	(await import('@blitz/internal/env')).then(
		(/** @type {any} */ mod) => !!mod,
		() => false
	);
