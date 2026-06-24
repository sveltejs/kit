import * as v from 'valibot';

export const match = v.pipe(v.string(), v.toNumber());
