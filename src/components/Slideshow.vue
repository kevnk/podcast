<script setup>
import { ref, inject } from 'vue'
import debounce from 'lodash.debounce'

const title = ref('')
const backgroundImage = ref('')
const aiService = inject('aiService', { generateImage: () => {} })

const generatePrompt = () => {
  return `Create a visual representation of: ${title.value}`
}

const updateBackground = debounce(async () => {
  if (!title.value) return
  try {
    const imageUrl = await aiService.generateImage(generatePrompt())
    backgroundImage.value = imageUrl
  } catch (error) {
    console.error('Failed to generate image:', error)
  }
}, 500)
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