/* eslint-disable */

/** @typedef {import('$app/paths/types.js').ResolveArgs<'/parsed/[id=number]'>} ParsedResolveArgs */

/** @type {ParsedResolveArgs} */
const _valid = ['/parsed/[id=number]', { id: 2 }];

/** @type {ParsedResolveArgs} */
// @ts-expect-error id must be a number
const _invalid_string = ['/parsed/[id=number]', { id: '2' }];

/** @type {ParsedResolveArgs} */
// @ts-expect-error id must be a number
const _invalid_boolean = ['/parsed/[id=number]', { id: true }];
