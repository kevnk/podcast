import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Slideshow from '@/components/Slideshow.vue'

describe('Slideshow.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders in fullscreen mode', () => {
    const wrapper = mount(Slideshow)
    expect(wrapper.classes()).toContain('fullscreen')
  })

  it('updates title when user types', async () => {
    const wrapper = mount(Slideshow)
    const input = wrapper.find('[data-test="title-input"]')
    
    await input.setValue('Mountain Sunset')
    expect(wrapper.vm.title).toBe('Mountain Sunset')
  })

  it('generates AI prompt from title', async () => {
    const wrapper = mount(Slideshow)
    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('Mountain Sunset')
    expect(wrapper.vm.generatePrompt()).toContain('Mountain Sunset')
  })

  it('calls AI service when title is updated', async () => {
    const mockGenerateImage = vi.fn().mockResolvedValue('mock-url')
    const wrapper = mount(Slideshow, {
      global: {
        provide: {
          aiService: { generateImage: mockGenerateImage }
        }
      }
    })
    
    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('Mountain Sunset')
    await vi.runAllTimers()
    
    expect(mockGenerateImage).toHaveBeenCalled()
  })

  it('updates background image when AI returns result', async () => {
    const mockImageUrl = 'https://example.com/generated-image.jpg'
    const mockGenerateImage = vi.fn().mockResolvedValue(mockImageUrl)
    const wrapper = mount(Slideshow, {
      global: {
        provide: {
          aiService: { generateImage: mockGenerateImage }
        }
      }
    })
    
    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('Mountain Sunset')
    await vi.runAllTimers()
    await wrapper.vm.$nextTick()
    
    const background = wrapper.find('[data-test="slide-background"]')
    expect(background.attributes('style')).toContain(mockImageUrl)
  })

  it('debounces AI calls while typing', async () => {
    const mockGenerateImage = vi.fn().mockResolvedValue('mock-url')
    const wrapper = mount(Slideshow, {
      global: {
        provide: {
          aiService: { generateImage: mockGenerateImage }
        }
      }
    })

    const input = wrapper.find('[data-test="title-input"]')
    await input.setValue('M')
    await input.setValue('Mo')
    await input.setValue('Mountain')
    
    await vi.runAllTimers()
    expect(mockGenerateImage).toHaveBeenCalledTimes(1)
  })
}) 