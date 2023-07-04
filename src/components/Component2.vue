<template>
  <div class="component2">
    <!-- Add your component's template here -->
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'Component2',
  setup() {
    const message = ref('Hello from Component2');

    return {
      message
    }
  }
}
</script>

<style scoped>
.component2 {
  /* Add your styles here */
}
</style>