export default defineNuxtPlugin(() => {
  useAuthStore().hydrateClient()
})
