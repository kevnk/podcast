export class AiService {
  constructor(groqKey, falKey, options = {}) {
    if (!groqKey || !falKey) {
      throw new Error('Both Groq and fal.ai API keys are required')
    }
    this.groqKey = groqKey
    this.falKey = falKey
    this.devMode = options.devMode || false
  }

  async generatePrompt(input) {
    if (!input || input.trim() === '') {
      throw new Error('Input cannot be empty')
    }

    if (this.devMode) {
      return `[DEV MODE] Prompt for: ${input}`
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqKey}`
        },
        body: JSON.stringify({
          model: "mixtral-8x7b-32768",
          messages: [
            {
              role: "system",
              content: `You are a creative assistant that generates descriptive abstract non-objective art image prompts. Keep the prompts concise but vivid. Draw from the user's input to find the sentiment and tone of the image. Remember all images should be non-objective and abstract so they can be used for thumbnail images. Keep them in the style of a famous artist.`
            },
            {
              role: "user",
              content: `Generate a detailed image prompt for: ${input}`
            }
          ],
          temperature: 0.7,
          max_tokens: 100,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || response.statusText)
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      throw new Error(`Failed to generate prompt: ${error.message}`)
    }
  }

  async generateImage(prompt) {
    if (this.devMode) {
      const encodedPrompt = prompt.replace(/ /g, '+')
      return `https://placehold.co/1024x1024?text=${encodedPrompt}`
    }

    try {
      const response = await fetch('https://fal.run/fal-ai/flux/dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${this.falKey}`
        },
        body: JSON.stringify({
          prompt: prompt,
          image_size: "square_hd"
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || response.statusText)
      }

      const data = await response.json()
      return data.images[0].url
    } catch (error) {
      throw new Error(`Failed to generate image: ${error.message}`)
    }
  }
} 