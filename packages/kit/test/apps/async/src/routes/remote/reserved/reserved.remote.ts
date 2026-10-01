import { command, query } from '$app/server';

const _delete = command(() => 'deleted');
const _class = query(() => 'classy');
const _return = command(() => '42');

export { _delete as delete, _class as class, _return as return };
