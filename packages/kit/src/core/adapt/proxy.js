import { resolve } from 'path';
import { SERVER_OUTPUT } from '../constants';

const cwd = resolve(process.cwd(), `${SERVER_OUTPUT}/app.js`);

export const init = async () => (await import(cwd)).init;

export const render = async () => (await import(cwd)).render;

export default { init, render };
