import { describe, it, expect, vi } from 'vitest'
import { AiService } from '../aiService'

describe('AiService', () => {
  it('generates a prompt using Groq API', async () => {
    const mockResponse = { 
      choices: [{ 
        message: { 
          content: 'A serene mountain landscape at sunset with golden light' 
        } 
      }] 
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const service = new AiService('mock-groq-key', 'mock-fal-key')
    const result = await service.generatePrompt('Mountain sunset')
    
    expect(result).toBe(mockResponse.choices[0].message.content)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-groq-key'
        },
        body: expect.any(String)
      })
    )
  })

  it('generates an image using fal.ai FLUX API', async () => {
    const mockResponse = { 
      images: [{ 
        url: 'https://fal.media/files/example.png',
        width: 1024,
        height: 1024,
        content_type: 'image/jpeg'
      }] 
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const service = new AiService('mock-groq-key', 'mock-fal-key')
    const result = await service.generateImage('A mountain sunset')
    
    expect(result).toBe(mockResponse.images[0].url)
    expect(fetch).toHaveBeenCalledWith(
      'https://fal.run/fal-ai/flux/dev',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Key mock-fal-key'
        },
        body: JSON.stringify({
          prompt: 'A mountain sunset',
          image_size: "square_hd"
        })
      })
    )
  })

  it('throws an error when API keys are missing', () => {
    expect(() => new AiService()).toThrow('Both Groq and fal.ai API keys are required')
    expect(() => new AiService('groq-only')).toThrow('Both Groq and fal.ai API keys are required')
  })

  it('throws an error when Groq API call fails', async () => {
    const errorResponse = {
      error: {
        message: 'Invalid API key'
      }
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(errorResponse),
      statusText: 'Unauthorized'
    })

    const service = new AiService('mock-groq-key', 'mock-fal-key')
    await expect(service.generatePrompt('Mountain sunset'))
      .rejects
      .toThrow('Failed to generate prompt: Invalid API key')
  })

  it('throws an error when fal.ai API call fails', async () => {
    const errorResponse = {
      error: {
        message: 'Bad Request'
      }
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(errorResponse),
      statusText: 'Bad Request'
    })

    const service = new AiService('mock-groq-key', 'mock-fal-key')
    await expect(service.generateImage('Invalid prompt'))
      .rejects
      .toThrow('Failed to generate image: Bad Request')
  })

  it('throws an error when network errors occur for both APIs', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const service = new AiService('mock-groq-key', 'mock-fal-key')
    await expect(service.generatePrompt('Mountain sunset'))
      .rejects
      .toThrow('Failed to generate prompt: Network error')
    await expect(service.generateImage('A mountain sunset'))
      .rejects
      .toThrow('Failed to generate image: Network error')
  })
}) 