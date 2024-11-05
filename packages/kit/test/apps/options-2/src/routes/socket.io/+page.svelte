<script>
	import { browser } from "$app/environment";
	import { io  } from "socket.io-client"
	import { base } from '$app/paths';

	const messages = []

	if(browser) {
		const socket = io(undefined, {path: `${base}/socket.io`})

		socket.on("connect", () => {
			console.log("connected")
			socket.emit("chat message", "hello world")
		})

		socket.on("disconnect", () => {
			console.log("disconnected")
		})

		socket.on("message", (data) => {
			messages.push(data)
			console.log(data)
		})
	}
</script>

<h1>Messages:</h1>

<div>
	{#each messages as message}
		<p>{message}</p>
	{/each}
</div>
