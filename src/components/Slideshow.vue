<script setup>
import { ref, inject, onBeforeUnmount, computed, watch } from 'vue';
import debounce from 'lodash.debounce';
import { AiService } from '@/services/aiService';

const title = ref('');
const backgroundImage = ref('');
const newImageUrl = ref('');
const isLoaded = ref(false);
const isTransitioning = ref(false);
const devMode = ref(false);
const isLoading = ref(false);

const isDev = computed(() => process.env.NODE_ENV === 'development');

// Update document title when loading state or title changes
watch([isLoading, title], ([loading, currentTitle]) => {
	document.title = loading ? 'Loading...' : (currentTitle || 'Enter your title...');
});

const aiService = inject('aiService', new AiService(
	import.meta.env.VITE_GROQ_API_KEY,
	import.meta.env.VITE_FAL_API_KEY,
	{ devMode: devMode.value }
));

const updateBackground = debounce(async () => {
	if (!title.value) return;
	try {
		isLoading.value = true;
		const enhancedPrompt = await aiService.generatePrompt(title.value);
		console.log('Enhanced prompt:', enhancedPrompt);

		const imageUrl = await aiService.generateImage(enhancedPrompt);
		if (devMode.value || !backgroundImage.value) {
			// Set immediately for dev mode or first image
			backgroundImage.value = imageUrl;
			isLoading.value = false;
		} else {
			// Use transition for subsequent images
			newImageUrl.value = imageUrl;
		}
	} catch (error) {
		console.error('Failed to generate image:', error);
		isLoading.value = false;
	}
}, 500);

watch(devMode, (newValue) => {
	aiService.devMode = newValue;
	if (title.value) {
		updateBackground();
	}
});

const handleImageLoad = () => {
	isLoaded.value = true;
	isLoading.value = false;
	requestAnimationFrame(() => {
		isTransitioning.value = true;
	});
};

const handleTransitionEnd = () => {
	backgroundImage.value = newImageUrl.value;
	newImageUrl.value = '';
	isLoaded.value = false;
	isTransitioning.value = false;
};

onBeforeUnmount(() => {
	updateBackground.cancel();
	document.title = 'Enter your title...'; // Reset title on unmount
});
</script>

<template>
	<div class="fullscreen">
		<!-- Current background -->
		<div class="background-layer" :style="{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none' }"
			data-test="slide-background" />

		<!-- New image layer -->
		<div v-if="newImageUrl && isLoaded" class="background-layer" :class="{ 'fade-in': isTransitioning }"
			:style="{ backgroundImage: `url(${newImageUrl})` }" @transitionend="handleTransitionEnd" data-test="new-image" />

		<!-- Hidden image preloader -->
		<img v-show="newImageUrl" :src="newImageUrl" @load="handleImageLoad" class="preload-image" alt="" />

		<input type="text" v-model="title" @keyup.enter="updateBackground" placeholder="Enter your title..."
			data-test="title-input" class="title-input" />

		<div v-if="isDev" class="dev-controls">
			<label>
				<input type="checkbox" v-model="devMode" @change="updateBackground" data-test="dev-mode-toggle" />
				Dev Mode (use placeholders)
			</label>
		</div>
	</div>
</template>

<style scoped>
.fullscreen {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.background-layer {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-size: cover;
	background-position: center;
	opacity: 0;
	transition: opacity 0.5s ease;
}

.background-layer:first-child {
	opacity: 1;
}

.background-layer.fade-in {
	opacity: 1;
}

.preload-image {
	position: absolute;
	width: 1px;
	height: 1px;
	opacity: 0;
	pointer-events: none;
}

/* Rest of your existing styles */
.title-input {
	position: relative;
	z-index: 1;
	background: transparent;
	border: none;
	color: white;
	font-size: 4rem;
	font-weight: 700;
	text-align: center;
	width: 80%;
	padding: 20px;
	outline: none;
	text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.title-input::placeholder {
	color: rgba(255, 255, 255, 0.7);
}

.dev-controls {
	position: fixed;
	bottom: 20px;
	right: 20px;
	background: rgba(0, 0, 0, 0.5);
	padding: 10px;
	border-radius: 5px;
	color: white;
	z-index: 1;
}
</style>