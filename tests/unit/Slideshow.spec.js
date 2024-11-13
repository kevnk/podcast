import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import Slideshow from '@/components/Slideshow.vue';
import { AiService } from '@/services/aiService';

let mockDevMode = false;

describe('Slideshow.vue', () => {
	let aiService;
	let wrapper;

	beforeEach(() => {
		vi.useFakeTimers();

		const mockGroqKey = 'test-groq-key';
		const mockFalKey = 'test-fal-key';
		vi.stubEnv('VITE_GROQ_API_KEY', mockGroqKey);
		vi.stubEnv('VITE_FAL_API_KEY', mockFalKey);

		aiService = new AiService(mockGroqKey, mockFalKey);
		aiService.generatePrompt = vi.fn().mockImplementation(text =>
			mockDevMode ? `[DEV MODE] Prompt for: ${text}` : 'Enhanced prompt: A beautiful mountain sunset'
		);
		aiService.generateImage = vi.fn().mockImplementation(() =>
			mockDevMode ? 'https://placehold.co/600x400' : 'https://example.com/generated-image.jpg'
		);
		
		wrapper = mount(Slideshow, {
			global: {
				provide: {
					aiService
				}
			}
		});
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.clearAllMocks();
	});

	it('updates background image when AI returns result', async () => {
		const input = wrapper.find('[data-test="title-input"]');
		await input.setValue('Mountain Sunset');

		await vi.runAllTimers();
		await flushPromises();

		expect(aiService.generatePrompt).toHaveBeenCalledWith('Mountain Sunset');
		expect(aiService.generateImage).toHaveBeenCalledWith('Enhanced prompt: A beautiful mountain sunset');

		const background = wrapper.find('[data-test="slide-background"]');
		expect(background.attributes('style'))
			.toBe('background-image: url(https://example.com/generated-image.jpg);');
	});

	it('debounces AI calls while typing', async () => {
		const input = wrapper.find('[data-test="title-input"]');
		await input.setValue('M');
		await input.setValue('Mo');
		await input.setValue('Mountain');

		await vi.runAllTimers();
		expect(aiService.generatePrompt).toHaveBeenCalledTimes(1);
		expect(aiService.generatePrompt).toHaveBeenCalledWith('Mountain');
	});

	it('does not call AI service if input is empty', async () => {
		const input = wrapper.find('[data-test="title-input"]');
		await input.setValue('');
		await vi.runAllTimers();

		expect(aiService.generatePrompt).not.toHaveBeenCalled();
		expect(aiService.generateImage).not.toHaveBeenCalled();
	});

	it('handles AI service errors gracefully', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
		aiService.generatePrompt.mockRejectedValueOnce(new Error('API Error'));

		const input = wrapper.find('[data-test="title-input"]');
		await input.setValue('Mountain Sunset');
		await vi.runAllTimers();
		await flushPromises();

		expect(consoleSpy).toHaveBeenCalledWith('Failed to generate image:', expect.any(Error));
		expect(wrapper.find('[data-test="slide-background"]').attributes('style'))
			.toBe('background-image: none;');

		consoleSpy.mockRestore();
	});

	it('waits for debounce period before making AI call', async () => {
		const input = wrapper.find('[data-test="title-input"]');
		await input.setValue('Quick');

		expect(aiService.generatePrompt).not.toHaveBeenCalled();

		await vi.advanceTimersByTime(400);
		expect(aiService.generatePrompt).not.toHaveBeenCalled();

		await vi.advanceTimersByTime(100);
		expect(aiService.generatePrompt).toHaveBeenCalledTimes(1);
	});

	it('cancels pending debounced calls when component unmounts', async () => {
		const input = wrapper.find('[data-test="title-input"]');
		await input.setValue('Mountain');

		wrapper.unmount();
		await vi.advanceTimersByTime(500);

		expect(aiService.generatePrompt).not.toHaveBeenCalled();
	});

	it('toggles dev mode when checkbox is clicked', async () => {
		vi.stubEnv('NODE_ENV', 'development');
		mockDevMode = true;
		
		const wrapper = mount(Slideshow, {
			global: {
				provide: {
					aiService
				}
			}
		});
	
		const input = wrapper.find('[data-test="title-input"]');
		await input.setValue('Mountain');
	
		const devModeToggle = wrapper.find('[data-test="dev-mode-toggle"]');
		expect(devModeToggle.exists()).toBe(true);
	
		await devModeToggle.setValue(true);
		await vi.runAllTimers();
		await flushPromises();
	
		expect(aiService.generatePrompt).toHaveBeenCalledWith('Mountain');
		expect(aiService.generateImage).toHaveBeenCalled();
		
		const background = wrapper.find('[data-test="slide-background"]');
		expect(background.attributes('style')).toContain('placehold.co');
	
		vi.unstubAllEnvs();
		mockDevMode = false;
	});
});

describe('Slideshow Image Transitions', () => {
	let aiService;
	let wrapper;

	beforeEach(() => {
		vi.useFakeTimers();

		aiService = new AiService('test-groq-key', 'test-fal-key');
		aiService.generatePrompt = vi.fn().mockResolvedValue('Enhanced prompt');
		aiService.generateImage = vi.fn().mockResolvedValue('https://example.com/new-image.jpg');

		wrapper = mount(Slideshow, {
			global: {
				provide: {
					aiService
				}
			}
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
	});

	it('fades between images smoothly', async () => {
		// Disable dev mode
		wrapper.vm.devMode = false;

		// Set initial background
		wrapper.vm.backgroundImage = 'https://example.com/initial-image.jpg';

		// Trigger new image generation
		const input = wrapper.find('[data-test="title-input"]');
		await input.setValue('New Image');
		await vi.runAllTimers();
		await flushPromises();

		// Verify new layer is not visible before image loads
		expect(wrapper.find('[data-test="new-image"]').exists()).toBe(false);

		// Mock requestAnimationFrame
		const rafSpy = vi.spyOn(window, 'requestAnimationFrame')
			.mockImplementation(cb => setTimeout(cb, 0));

		// Simulate image load
		await wrapper.find('.preload-image').trigger('load');
		
		// Wait for the next tick to allow requestAnimationFrame to execute
		await vi.runAllTimers();
		await flushPromises();

		const newLayer = wrapper.find('[data-test="new-image"]');
		expect(newLayer.exists()).toBe(true);
		expect(newLayer.attributes('style'))
			.toBe('background-image: url(https://example.com/new-image.jpg);');
		expect(newLayer.classes()).toContain('fade-in');

		// Simulate transition end
		await newLayer.trigger('transitionend');
		await flushPromises();

		// Verify cleanup
		expect(wrapper.vm.newImageUrl).toBe('');
		expect(wrapper.find('[data-test="new-image"]').exists()).toBe(false);

		// Clean up
		rafSpy.mockRestore();
	});
});