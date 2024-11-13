import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Slideshow from '@/components/Slideshow.vue'
import { AiService } from '@/services/aiService'

describe('Slideshow.vue', () => {
  let aiService
  let wrapper

  beforeEach(() => {
    vi.useFakeTimers()
    
    const mockGroqKey = 'test-groq-key'
    const mockFalKey = 'test-fal-key'
    vi.stubEnv('VITE_GROQ_API_KEY', mockGroqKey)
    vi.stubEnv('VITE_FAL_API_KEY', mockFalKey)
    
    aiService = new AiService(mockGroqKey, mockFalKey)
    aiService.generatePrompt = vi.fn().mockResolvedValue('Enhanced prompt: A beautiful mountain sunset')
    aiService.generateImage = vi.fn().mockResolvedValue('https://example.com/generated-image.jpg')
    
    wrapper = mount(Slideshow, {
      global: {
        provide: {
          aiService
        }
      }
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('updates background image when AI returns result', async () => {
    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('Mountain Sunset')
    
    await vi.runAllTimers()
    await flushPromises()
    
    expect(aiService.generatePrompt).toHaveBeenCalledWith('Mountain Sunset')
    expect(aiService.generateImage).toHaveBeenCalledWith('Enhanced prompt: A beautiful mountain sunset')
    
    const background = wrapper.find('[data-test="slide-background"]')
    expect(background.attributes('style'))
      .toBe('background-image: url(https://example.com/generated-image.jpg);')
  })

  it('debounces AI calls while typing', async () => {
    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('M')
    await input.setValue('Mo')
    await input.setValue('Mountain')
    
    await vi.runAllTimers()
    expect(aiService.generatePrompt).toHaveBeenCalledTimes(1)
    expect(aiService.generatePrompt).toHaveBeenCalledWith('Mountain')
  })

  it('does not call AI service if input is empty', async () => {
    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('')
    await vi.runAllTimers()
    
    expect(aiService.generatePrompt).not.toHaveBeenCalled()
    expect(aiService.generateImage).not.toHaveBeenCalled()
  })

  it('handles AI service errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    aiService.generatePrompt.mockRejectedValueOnce(new Error('API Error'))
    
    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('Mountain Sunset')
    await vi.runAllTimers()
    await flushPromises()
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to generate image:', expect.any(Error))
    expect(wrapper.find('[data-test="slide-background"]').attributes('style'))
      .toBe('background-image: url();')
    
    consoleSpy.mockRestore()
  })

  it('waits for debounce period before making AI call', async () => {
    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('Quick')
    
    expect(aiService.generatePrompt).not.toHaveBeenCalled()
    
    await vi.advanceTimersByTime(400)
    expect(aiService.generatePrompt).not.toHaveBeenCalled()
    
    await vi.advanceTimersByTime(100)
    expect(aiService.generatePrompt).toHaveBeenCalledTimes(1)
  })

  it('cancels pending debounced calls when component unmounts', async () => {
    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('Mountain')
    
    wrapper.unmount()
    await vi.advanceTimersByTime(500)
    
    expect(aiService.generatePrompt).not.toHaveBeenCalled()
  })

  it('toggles dev mode when checkbox is clicked', async () => {
    const wrapper = mount(Slideshow, {
      global: {
        provide: {
          aiService
        }
      }
    })
    
    // Mock import.meta.env.DEV
    vi.stubGlobal('import.meta.env.DEV', true)
    
    const input = wrapper.find('[data-test="title-input"]')
    const devModeToggle = wrapper.find('[data-test="dev-mode-toggle"]')
    
    await input.setValue('Mountain')
    await devModeToggle.setValue(true)
    await vi.runAllTimers()
    
    expect(wrapper.find('[data-test="slide-background"]').attributes('style'))
      .toContain('placehold.co')
    
    vi.unstubGlobal('import.meta.env.DEV')
  })
})

describe('Slideshow Image Transitions', () => {
  let aiService
  let wrapper

  beforeEach(() => {
    vi.useFakeTimers()
    
    aiService = new AiService('test-groq-key', 'test-fal-key')
    aiService.generatePrompt = vi.fn().mockResolvedValue('Enhanced prompt')
    aiService.generateImage = vi.fn().mockResolvedValue('https://example.com/new-image.jpg')
    
    wrapper = mount(Slideshow, {
      global: {
        provide: {
          aiService
        }
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  it('fades between images smoothly', async () => {
    // Set initial background
    wrapper.vm.backgroundImage = 'https://example.com/initial-image.jpg'
    
    // Trigger new image generation
    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('New Image')
    await vi.runAllTimers()
    await flushPromises()

    // Verify new layer is not visible before image loads
    expect(wrapper.find('[data-test="new-image"]').exists()).toBe(false)

    // Simulate image load
    const preloadImage = wrapper.find('.preload-image')
    await preloadImage.trigger('load')
    
    // Wait for next animation frame
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    // Verify both layers exist during transition
    const oldLayer = wrapper.find('[data-test="slide-background"]')
    const newLayer = wrapper.find('[data-test="new-image"]')
    
    expect(oldLayer.attributes('style'))
      .toBe('background-image: url(https://example.com/initial-image.jpg);')
    expect(newLayer.attributes('style'))
      .toBe('background-image: url(https://example.com/generated-image.jpg);')
    expect(newLayer.classes()).toContain('fade-in')
    
    // Simulate transition end
    await newLayer.trigger('transitionend')
    
    // Verify cleanup
    expect(wrapper.vm.backgroundImage).toBe('https://example.com/generated-image.jpg')
    expect(wrapper.vm.newImageUrl).toBe('')
    expect(wrapper.find('[data-test="new-image"]').exists()).toBe(false)
  })
}) 