<script>
	import volume_off from './volume-off.svg';
	import volume_high from './volume-high.svg';
	import { onMount } from 'svelte';

	/** @type {HTMLVideoElement} */
	let video;
	let muted = true;
	let unused = true;

	let d = 0;
	let t = 0;

	onMount(() => {
		// I think this binding is broken in SSR because the video already
		// has a duration by the time hydration occurs. TODO investigate
		d = video.duration;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						video.play();
						observer.disconnect();
					}
				}
			},
			{
				threshold: 1
			}
		);

		observer.observe(video);

		return () => {
			observer.disconnect();
		};
	});
</script>

<div class="video-player">
	<video
		src="https://sveltejs.github.io/assets/svelte-origins-preview.mp4"
		loop
		bind:this={video}
		bind:muted
		bind:currentTime={t}
		bind:duration={d}
		on:click={() => {
			if (video.paused) {
				video.play();
			} else {
				video.pause();
			}
		}}
	>
		<!-- TODO-->
		<track kind="captions" />
	</video>

	{#if d}
		<div class="progress-bar" style={`width: ${(t / d) * 100}%`} />
	{/if}

	<label class:unused>
		<input type="checkbox" bind:checked={muted} on:change={() => (unused = false)} />

		<img style:display={muted ? 'block' : 'none'} src={volume_off} alt="unmute" />
		<img style:display={muted ? 'none' : 'block'} src={volume_high} alt="mute" />
	</label>
</div>

<style>
	.video-player {
		position: relative;
		margin: 1em 0;
		border-radius: var(--sk-border-radius);
		filter: drop-shadow(0.5rem 0.5rem 1rem rgba(0, 0, 0, 0.2));
		overflow: hidden;
	}

	video {
		width: 100%;
		display: block;
	}

	.progress-bar {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 0.5rem;
		background: var(--sk-theme-1);
		transition: height 0.2s;
	}

	label {
		position: absolute;
		top: 1rem;
		right: 1rem;
		opacity: 0.2;
		transition: opacity 0.2s;
	}

	label.unused {
		opacity: 0.8;
	}

	input {
		display: none;
	}

	label img {
		width: 3rem;
		height: 3rem;
		filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.3));
	}

	/* TODO re-enable when we get drag-to-seek */
	/* .video-player:hover .progress-bar {
		height: 1rem;
		border-radius: 0 var(--sk-border-radius) var(--sk-border-radius) var(--sk-border-radius);
	} */

	.video-player:hover label {
		opacity: 1;
	}
</style>
