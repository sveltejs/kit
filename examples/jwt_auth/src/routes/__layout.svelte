<script context="module">
    export async function load({session}){
        if(!session?.user){
            return {
                redirect : '/auth/login',
                status:302
            }
        }
        return {
            props  :{
                user : session?.user
            }
        }
    }
</script>

<script>
    import NavBar from "$lib/NavBar.svelte";
    import "../app.css";
</script>

<NavBar/>

<div class="mx-3 grid place-content-center h-[50vh]">
    <slot/>
</div>