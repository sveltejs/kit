<script>
    let pressed = false;
</script>

<button class:pressed on:click={() => { pressed = true; }}>
    {pressed ? 'Was Pressed!' : 'Not Pressed Yet'}
</button>

<style>
    button {
        padding: 5px;

        background-color: red;
        color: black;
    }

    button.pressed {
        background-color: green;
        color: white;
    }
</style>