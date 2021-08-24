<script lang="ts">
	import { dev, browser } from '$app/env';
	import { Workbox, messageSW } from 'workbox-window';

	let wb;
	let registration;

	let offlineReady = false;
	let needRefresh = false;

	function showSkipWaitingPrompt(event) {
		// \`event.wasWaitingBeforeRegister\` will be false if this is
		// the first time the updated service worker is waiting.
		// When \`event.wasWaitingBeforeRegister\` is true, a previously
		// updated service worker is still waiting.
		// You may want to customize the UI prompt accordingly.
		// Assumes your app has some sort of prompt UI element
		// that a user can either accept or reject.
		// THIS WILL NEVER BE CALLED ON AUTO UPDATE.
		needRefresh = true;
	}

	function updateServiceWorker() {
		// Assuming the user accepted the update, set up a listener
		// that will reload the page as soon as the previously waiting
		// service worker has taken control.
		if (wb) {
			wb.addEventListener('controlling', (event) => {
				if (event.isUpdate) {
					window.location.reload();
				}
			});
		}
		if (registration && registration.waiting) {
			// Send a message to the waiting service worker,
			// instructing it to activate.
			// Note: for this to work, you have to add a message
			// listener in your service worker. See below.
			messageSW(registration.waiting, { type: 'SKIP_WAITING' }).then(() => {
				// console.log("NOTIFIED SKIP_WAITING");
			}).catch(e => {
				console.error('NOTIFIED SKIP_WAITING WITH ERROR', e);
			});
		}
	}

	function close() {
		offlineReady = false;
		needRefresh = false;
	}

	if (!dev && browser) {
		if ('serviceWorker' in navigator) {
			wb = new Workbox('/service-worker.js', { scope: '/' });
			wb.addEventListener('activated', (event) => {
				// this will only controls the offline request.
				// event.isUpdate will be true if another version of the service
				// worker was controlling the page when this version was registered.
				if (!event.isUpdate) {
					offlineReady = true;
				}
			});
			// Add an event listener to detect when the registered
			// service worker has installed but is waiting to activate.
			wb.addEventListener('waiting', showSkipWaitingPrompt);
			// eslint-disable-next-line
			// @ts-ignore
			wb.addEventListener('externalwaiting', showSkipWaitingPrompt);
			// register the service worker
			wb.register({ immediate: true }).then(r => registration = r).catch(e => {
				console.error('cannot register service worker', e);
			});
		} else {
			console.warn('Service workers are not supported.');
		}
	}

  $: toast = offlineReady || needRefresh;
</script>

{#if toast}
  <div
    class="pwa-toast"
    role="alert"
  >
    <div class="message">
      {#if offlineReady}
      <span>
        App ready to work offline
      </span>
      {:else}
      <span>
        New content available, click on reload button to update.
      </span>
      {/if}
    </div>
    {#if needRefresh}
      <button on:click={() => updateServiceWorker(true)}>
        Reload
      </button>
    {/if}
    <button on:click={close}>
      Close
    </button>
  </div>
{/if}

<style>
    .pwa-toast {
        position: fixed;
        right: 0;
        bottom: 0;
        margin: 16px;
        padding: 12px;
        border: 1px solid #8885;
        border-radius: 4px;
        z-index: 2;
        text-align: left;
        box-shadow: 3px 4px 5px 0 #8885;
        background-color: white;
    }
    .pwa-toast .message {
        margin-bottom: 8px;
    }
    .pwa-toast button {
        border: 1px solid #8885;
        outline: none;
        margin-right: 5px;
        border-radius: 2px;
        padding: 3px 10px;
    }
</style>
