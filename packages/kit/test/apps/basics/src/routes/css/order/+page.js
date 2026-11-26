import './cycle.js';
import './after-cycle.css';

export async function load() {
	await import('./late.css');
}
