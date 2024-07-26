import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request }) {
    const { signal } = request
    let aborted = signal.aborted
    const abortHandler = () => { 
        aborted = true
        console.log('abortHandler', { aborted })
    }
    if (!aborted) {
        signal.addEventListener('abort', abortHandler)
    }
    for (let i = 0; i < 5; i++) {
        await sleep(1000)
        console.log('check', { aborted })
        if (aborted) {
            return json({ aborted });
        }
    }
	return json({ aborted });
}


function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => { resolve(true) }, ms)
    })
}
