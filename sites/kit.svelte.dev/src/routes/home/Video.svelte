<script>
	import volume_off from './volume-off.svg';
	import volume_high from './volume-high.svg';
	import play from '$lib/icons/play.svg';
	import pause from '$lib/icons/pause.svg';
	import vtt from './subtitles.vtt';
	import { onMount } from 'svelte';

	/** @type {HTMLVideoElement} */
	let video;

	let paused = false;
	let muted = true;
	let has_used_mute_button = false;

	let d = 0;
	let t = 0;

	onMount(() => {
		// I think this binding is broken in SSR because the video already
		// has a duration by the time hydration occurs. TODO investigate
		d = video.duration;
		paused = video.paused;

		if (matchMedia('(prefers-reduced-motion)').matches) {
			return;
		}

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
		bind:paused
		bind:currentTime={t}
		bind:duration={d}
		on:click={() => {
			if (video.paused) {
				video.play();

				if (!has_used_mute_button) {
					muted = false;
				}
			} else {
				video.pause();
			}
		}}
	>
		<track kind="captions" srclang="en" src={vtt} />
	</video>

	{#if d}
		<div class="progress-bar" style={`width: ${(t / d) * 100}%`} />
	{/if}

	<label class="mute" class:unused={!has_used_mute_button}>
		<input
			class="visually-hidden"
			type="checkbox"
			bind:checked={muted}
			on:change={() => (has_used_mute_button = true)}
		/>

		<span class="focus-ring" />
		<img style:display={muted ? 'block' : 'none'} src={volume_off} alt="unmute" />
		<img style:display={muted ? 'none' : 'block'} src={volume_high} alt="mute" />
	</label>

	<label class="play-pause">
		<input
			class="visually-hidden"
			type="checkbox"
			bind:checked={paused}
			on:change={() => {
				if (!has_used_mute_button) {
					muted = false;
				}
			}}
		/>

		<span class="focus-ring" />
		<img style:display={paused ? 'block' : 'none'} src={play} alt="play" />
		<img style:display={paused ? 'none' : 'block'} src={pause} alt="pause" />
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

	video:focus {
		outline: 1px solid var(--sk-theme-1);
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
		opacity: 0.2;
		transition: opacity 0.2s;
	}

	.mute {
		top: 1rem;
		right: 1rem;
	}

	.play-pause {
		left: 1rem;
		bottom: 2rem;
	}

	label.unused {
		opacity: 0.8;
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

	.video-player:hover label,
	.video-player label:focus-within {
		opacity: 1;
	}

	.video-player input:focus-visible + .focus-ring {
		display: block;
		position: absolute;
		pointer-events: none;
		outline: 2px solid var(--sk-theme-1);
		width: 100%;
		height: 100%;
		border-radius: var(--sk-border-radius);
	}
</style>
