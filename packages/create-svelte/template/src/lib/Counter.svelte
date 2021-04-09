<script>
	import { backIn } from 'svelte/easing';
	let action = {};
	let count = 0;
	$: isDeniedOperation = action.operation === 'REMOVE' && count === 0

	const updateCountValue = () => {
		if(!action.operation) return count = 0;
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
				if(!action.operation || isDeniedOperation) return '';

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
		<div id="scroll" in:counterTransition="{{duration: 500}}">
			<h1>{count + 1}</h1>
			<h1>{count}</h1>
			<h1>{count - 1}</h1>
		</div>
	{/key}
</div>

<p>Counts so far</p>

<div class="counterControls">
	<button class:disabled={count === 0} on:click={() => action.operation = 'REMOVE'} aria-label="Decrease the counter by one">
		<img src="decrease-icon.svg" alt="Decrease the counter by one" />
	</button>
	<div>{count}</div>
	<button on:click={() => action.operation = 'ADD'}  aria-label="Increase the counter by one">
		<img src="increase-icon.svg" alt="Increase the counter by one" />
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
