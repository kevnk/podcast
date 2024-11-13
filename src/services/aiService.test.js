import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AiService } from './aiService'

describe('AiService', () => {
  let aiService
  
  beforeEach(() => {
    aiService = new AiService('test-groq-key', 'test-fal-key')
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('generatePrompt', () => {
    it('should only generate prompt when Enter is pressed', async () => {
      // Mock successful API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Generated prompt' } }]
        })
      })

      const input = 'test prompt'
      const result = await aiService.generatePrompt(input)
      
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.any(Object)
      )
      
      expect(result).toBe('Generated prompt')
    })

    it('should not generate prompt if input is empty', async () => {
      const input = ''
      await expect(aiService.generatePrompt(input)).rejects.toThrow()
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
}) 