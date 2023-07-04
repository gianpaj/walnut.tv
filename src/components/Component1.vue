<template>
  <div id="component1">
    <!-- Your HTML code here -->
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'Component1',
  setup() {
    const message = ref('Hello from Component1');

    return {
      message
    }
  }
}
</script>

<style scoped>
/* Your CSS code here */
</style>