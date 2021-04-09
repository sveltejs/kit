<script>
	import { backIn } from 'svelte/easing';
	let action = { operation: undefined };
	let count = 0;
	$: isDeniedOperation = !action.operation || (action.operation === 'REMOVE' && count === 0)

	const updateCountValue = () => {
		if(isDeniedOperation) return;
		
		count += action.operation === 'ADD' ? 1 : -1; 
	}
	
	const counterTransition = (_, { duration }) => {
		return {
			duration,
			delay: 300,
			tick: (t) => {
				if(t === 1 && !isDeniedOperation) updateCountValue()
			},
			css: t => {
				if(isDeniedOperation) return '';

				const easedDistance = backIn(t) * 74;
				
				return `
					transform: translateY(${action.operation === 'REMOVE' ? `-${easedDistance}px` : `${easedDistance}px`});
				`
			}
		};
	}
</script>


<div class="counter-container">
	{#key action}
		<div in:counterTransition="{{duration: 500}}">
			<h1>{count + 1}</h1>
			<h1>{count}</h1>
			<h1>{count - 1}</h1>
		</div>
	{/key}
</div>

<p>Counts so far</p>

<div class="counterControls">
	<button class:disabled={count === 0} on:click={() => action.operation = 'REMOVE'} aria-label="Decrease the counter by one">
		<svg width="16" height="2" viewBox="0 0 16 2" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M1.25 1H15.25" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>			
	</button>
	<div>{count}</div>
	<button on:click={() => action.operation = 'ADD'}  aria-label="Increase the counter by one">
		<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
			<path fill-rule="evenodd" d="M9,0 L9,8 L16,8 L16,9 L9,9 L9,17 L8,17 L8,9 L0,9 L0,8 L8,8 L8,0 L9,0 Z" transform="translate(3 3)"/>
		</svg>
	</button>
</div>

<style>
	.counterControls {
		display: flex;
	}

	.counterControls button.disabled {
		opacity: 0.3;
	}
	
	.counterControls button {
		width: 36px;
		margin: 0 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: 4px;
		background-color: transparent;
		color: var(--text-color);
		font-size: 2rem;
		transition: background-color 0.2s linear;
	}

	.counterControls button:hover {
		background-color: var(--secondary-color);
	}

	.counterControls button svg path {
		stroke: var(--text-color);
		fill: var(--text-color);
	}

	.counterControls div {
		min-width: 32px;
		padding: 8px 16px;
		border-radius: 4px;
		background-color: var(--pure-white);
		font-weight: bold;
		text-align: center;
		color: var(--secondary-text-color);
	}

	p {
		font-size: 0.75rem;
		color: var(--text-color);
		text-transform: uppercase;
		font-weight: 700;
		letter-spacing: 0.1em;
	}
	
	.counter-container {
		width: 100%;
		height: 90px;
		overflow: hidden;
		text-align: center;
		position: relative;
	}

	.counter-container h1 {
		font-weight: 400;
		transform: translateY(-60px);
		color: var(--accent-color);
		font-size: 4rem;
		margin: 0;
	}

	.counter-container:after {
		content: '';
		width: 100%;
		height: 140px;
		position: absolute;
		top: -25px;
		left: 0;
	}
</style>
