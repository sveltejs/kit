import { command, query } from '$app/server';

export const echo = query((value) => value);
export const add = query((a, b) => a + b);
export const add2 = query((a, b) => a + b);

export const multiply = command((a, b) => a * b);
