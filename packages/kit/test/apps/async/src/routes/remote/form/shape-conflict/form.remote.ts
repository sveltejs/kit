import { form } from '$app/server';

export const conflict = form('unchecked', () => 'Handler should not run');
