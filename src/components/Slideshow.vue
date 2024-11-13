<script setup>
import { ref, inject, onBeforeUnmount } from 'vue'
import debounce from 'lodash.debounce'
import { AiService } from '@/services/aiService'

const title = ref('')
const backgroundImage = ref('')
const aiService = inject('aiService', new AiService(
  import.meta.env.VITE_GROQ_API_KEY,
  import.meta.env.VITE_FAL_API_KEY
))

const updateBackground = debounce(async () => {
  if (!title.value) return
  try {
    const enhancedPrompt = await aiService.generatePrompt(title.value)
    console.log('Enhanced prompt:', enhancedPrompt)
    
    const imageUrl = await aiService.generateImage(enhancedPrompt)
    backgroundImage.value = imageUrl
  } catch (error) {
    console.error('Failed to generate image:', error)
  }
}, 500)

onBeforeUnmount(() => {
  updateBackground.cancel()
})
</script>

<template>
  <div class="fullscreen" data-test="slide-background" :style="{ backgroundImage: `url(${backgroundImage})` }">
    <input
      type="text"
      v-model="title"
      @input="updateBackground"
      placeholder="Enter your title..."
      data-test="title-input"
    />
  </div>
</template>

<style scoped>
.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-size: cover;
  background-position: center;
}

input {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 1rem;
  font-size: 1.5rem;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  width: 80%;
  max-width: 600px;
}
</style> 