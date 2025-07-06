import type { NextApiRequest, NextApiResponse } from 'next'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { prompt } = req.body

  // Validate prompt
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    console.error('Invalid prompt received:', prompt)
    return res.status(400).json({ error: 'Prompt is required and must be a non-empty string.' })
  }

  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'

  const ipKey = `rate:ip:${ip}`
  const globalKey = 'rate:global'

  try {
    // Rate limiting via Upstash Redis
    const [ipCount, globalCount] = await Promise.all([
      redis.incr(ipKey),
      redis.incr(globalKey),
    ])

    if (ipCount === 1) await redis.expire(ipKey, 86400)
    if (globalCount === 1) await redis.expire(globalKey, 86400)

    if (ipCount > 19) {
      return res.status(429).json({ error: 'You have reached your daily limit (20 images per IP).' })
    }

    if (globalCount > 19) {
      return res.status(429).json({ error: 'Global image generation limit reached. Try again tomorrow.' })
    }

    // Image generation with timeout (9s max to avoid Vercel 10s limit)
    console.time('openai-image')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        n: 1,
        size: '512x512',
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    console.timeEnd('openai-image')

    let imageData

    try {
      imageData = await response.clone().json()
    } catch (err) {
      const fallbackText = await response.text()
      console.error('Error parsing JSON:', err);
      console.error('Failed to parse JSON from OpenAI:', fallbackText)
      return res.status(response.status).json({
        error: `Image API returned invalid JSON: ${fallbackText}`,
      })
    }

    if (!response.ok) {
      const errorText = imageData?.error?.message || 'Unknown error from OpenAI'
      console.error('OpenAI error response:', errorText)
      return res.status(response.status).json({ error: errorText })
    }

    const imageUrl = imageData?.data?.[0]?.url

    if (!imageUrl) {
      console.error('No image returned from OpenAI:', imageData)
      return res.status(500).json({ error: 'No image returned from OpenAI' })
    }

    return res.status(200).json({ imageUrl })
  } catch (error: unknown) {
    console.error('Image generation error:', error)

    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({ error: 'Image generation took too long. Please try again.' });
    }
    

    return res.status(500).json({
      error: 'An error occurred while generating the image.',
    })
  }
}
