<template>
  <div class="component3">
    <h1>This is Component 3</h1>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'Component3',
  setup() {
    const title = ref('This is Component 3');

    return {
      title
    }
  }
}
</script>

<style scoped>
.component3 {
  color: #333;
}
</style>