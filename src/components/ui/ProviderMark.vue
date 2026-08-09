<template>
  <svg v-if="name === 'Google'" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2.1H12z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.6c-.9.6-2.1 1-3.5 1a6.1 6.1 0 0 1-5.7-4.2H3v2.6A10 10 0 0 0 12 22z"
    />
    <path fill="#FBBC05" d="M6.3 13.8a6 6 0 0 1 0-3.8V7.4H3a10 10 0 0 0 0 9l3.3-2.6z" />
    <path
      fill="#4285F4"
      d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3 7.4L6.3 10A6.1 6.1 0 0 1 12 5.9z"
    />
  </svg>

  <svg
    v-else-if="name === 'LinkedIn'"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    aria-hidden="true"
  >
    <path
      fill="#0A66C2"
      d="M20.4 3H3.6A.6.6 0 0 0 3 3.6v16.8a.6.6 0 0 0 .6.6h16.8a.6.6 0 0 0 .6-.6V3.6a.6.6 0 0 0-.6-.6zM8.3 18.3H5.6V9.8h2.7v8.5zM7 8.6a1.6 1.6 0 1 1 0-3.1 1.6 1.6 0 0 1 0 3.1zm11.3 9.7h-2.7v-4.1c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2v4.2h-2.7V9.8h2.6v1.2h.1a2.9 2.9 0 0 1 2.6-1.4c2.8 0 3.3 1.8 3.3 4.2v4.5z"
    />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: string }>()
</script>
