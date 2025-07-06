// pages/api/generateImage.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { prompt } = req.body

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'Prompt is required and must be a non-empty string.' })
  }

  const ip =
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'

  const ipKey = `rate:ip:${ip}`
  const globalKey = 'rate:global'

  try {
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

    const jobId = `image-job:${Date.now()}:${Math.random()}`
    await redis.hset(jobId, {
      prompt,
      status: 'pending',
    })

    return res.status(202).json({ jobId })
  } catch (error) {
    console.error('Error queuing image job:', error)
    return res.status(500).json({ error: 'Failed to queue image generation job.' })
  }
}
