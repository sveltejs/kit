<script>
	import volume_off from './volume-off.svg';
	import volume_high from './volume-high.svg';
	import play from '$lib/icons/play.svg';
	import pause from '$lib/icons/pause.svg';
	import vtt from './subtitles.vtt';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	/** @type {HTMLVideoElement} */
	let video;

	let paused = false;
	let muted = true;
	let captioned = true;
	let has_used_mute_button = false;
	let has_used_cc_button = false;

	$: if (browser && video) {
		video.textTracks[0].mode = captioned ? 'showing' : 'hidden';
	}

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

	/**
	 * @param {HTMLTrackElement} node
	 */
	function set_cue_position(node) {
		const cues = node.track.cues;
		if (!cues) return;
		for (let i = 0; i < cues.length; i++) {
			// https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API#cue_settings
			cues[i].line = -2; // second line from the bottom
			cues[i].size = 80; // width is 80% of the available space
		}
	}
</script>

<div class="video-player">
	<video
		src="https://sveltejs.github.io/assets/svelte-origins-preview.mp4"
		loop
		playsinline
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
		<track kind="captions" srclang="en" src={vtt} default use:set_cue_position />
	</video>

	{#if d}
		<div class="progress-bar" style={`width: ${(t / d) * 100}%`} />
	{/if}

	<div class="top-controls">
		<label class="captions" class:unused={!has_used_cc_button}>
			<input
				class="visually-hidden"
				type="checkbox"
				bind:checked={captioned}
				on:change={() => (has_used_cc_button = true)}
			/>
			<span>CC</span>
		</label>

		<label class="mute" class:unused={!has_used_mute_button}>
			<input
				class="visually-hidden"
				type="checkbox"
				bind:checked={muted}
				on:change={() => (has_used_mute_button = true)}
			/>

			<img style:display={muted ? 'block' : 'none'} src={volume_off} alt="unmute" />
			<img style:display={muted ? 'none' : 'block'} src={volume_high} alt="mute" />
		</label>
	</div>

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
		--control-filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.3));
	}

	video:focus {
		outline: 1px solid var(--sk-theme-1);
	}

	video::cue {
		font-size: 1.25rem;
		line-height: 1.3;
	}

	@media (min-width: 600px) {
		video::cue {
			font-size: 1.75rem;
		}
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
		opacity: 0.2;
		transition: opacity 0.2s;
	}

	.top-controls {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.play-pause {
		left: 1rem;
		bottom: 2rem;
		position: absolute;
	}

	.captions {
		line-height: 1;
		color: white;
		font-size: 2rem;
		font-weight: 700;
		filter: var(--control-filter);
	}

	.captions input:checked + span {
		text-decoration: underline;
		text-decoration-color: var(--sk-theme-1);
		text-underline-offset: 4px;
	}

	label.unused {
		opacity: 0.8;
	}

	label img {
		width: 3rem;
		height: 3rem;
		filter: var(--control-filter);
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

	.video-player input:focus-visible ~ img,
	.video-player input:focus-visible ~ span {
		outline: 2px solid var(--sk-theme-1);
		outline-offset: 2px;
		border-radius: var(--sk-border-radius);
	}
</style>
