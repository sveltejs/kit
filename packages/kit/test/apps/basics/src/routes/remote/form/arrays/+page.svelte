<script>
	import { my_form } from './form.remote.js';

  my_form.fields.set({
    strings: [''],
    numbers: [0],
    objects: [{ name: '', age: 0 }]
  })
</script>

<form {...my_form}>
  <p>
    <button onclick={() => my_form.fields.strings.push('')}>Add String</button>
  </p>
  {#each my_form.fields.strings.value() as _, i (i)}
    <label>
      String {i + 1}
      <input {...my_form.fields.strings[i].as('text')} />
    </label>
  {/each}

  <p>
    <button onclick={() => my_form.fields.numbers.push(0)}>Add Number</button>
  </p>
  {#each my_form.fields.numbers.value() as _, i (i)}
    <label>
      Number {i + 1}
      <input {...my_form.fields.numbers[i].as('number')} />
    </label>
  {/each}

  <p>
    <button onclick={() => my_form.fields.objects.push({ name: '', age: 0 })}>Add Object</button>
  </p>
  {#each my_form.fields.objects.value() as _, i (i)}
    <label>
      Object {i + 1} Name
      <input {...my_form.fields.objects[i].name.as('text')} />
    </label>
    <label>
      Object {i + 1} Age
      <input {...my_form.fields.objects[i].age.as('number')} />
    </label>
  {/each}

  <button>Submit</button>
</form>