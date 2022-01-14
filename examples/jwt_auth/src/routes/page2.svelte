<script context="module">
    export async function  load({session}) {
        const {username} = session.user
        return {
            props : {
                username
            }
        }
    }
</script>
<script>
    export let username
</script>
<h1>Welcome {username}, you are authenticated on page2!</h1>
