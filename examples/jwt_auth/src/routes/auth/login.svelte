<script context="module">
    export const router = false // disabling client side router to run handleSession in hooks
</script>
<script>
    import Error from "./FormElements.svelte/Error.svelte";
    import Input from "./FormElements.svelte/Input.svelte";
    import SubmitButton from "./FormElements.svelte/SubmitButton.svelte";
    let username, password
    let error;

    async function handleSubmit() {
        error = undefined
        const url = '/auth/api/login'
        const method = 'POST'
        const headers = {'content-type':'application/json'}
        const body = JSON.stringify({username, password})
        const res = await fetch(url,{method, headers, body})
        if(res.status==401){
            const data = await res.json()
            error = data.error
        }else if(res.status==200){
            // goto('/')
            location.href = '/'
        }
    }
</script>

<form on:submit|preventDefault={handleSubmit}>
    <Input placeholder="Username" bind:value={username} type="text"/>
    <Input placeholder="Password" bind:value={password} type="password"/>
    <Error bind:error/>
    <SubmitButton text="Login"/>
</form>