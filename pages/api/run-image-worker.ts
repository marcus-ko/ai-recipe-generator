import type { NextApiRequest, NextApiResponse } from 'next'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const keys = await redis.keys('image-job:*')
    let processed = 0

    for (const key of keys) {
      const job = await redis.hgetall(key)

      if (!job || job.status !== 'pending') continue

      if (!job.prompt || typeof job.prompt !== 'string') {
        await redis.hset(key, { status: 'error', error: 'Invalid or missing prompt' })
        continue
      }

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: job.prompt,
            n: 1,
            size: '512x512',
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        const data = await response.json()
        const imageUrl = data?.data?.[0]?.url

        if (imageUrl) {
          await redis.hset(key, { status: 'complete', imageUrl })
        } else {
          await redis.hset(key, { status: 'error', error: 'Image not generated' })
        }

        processed++
      } catch (err) {
        console.error('Image generation failed:', err)
        await redis.hset(key, { status: 'error', error: 'Image generation error' })
      }
    }

    return res.status(200).json({ processed })
  } catch (err) {
    console.error('Worker error:', err)
    return res.status(500).json({ error: 'Worker crashed' })
  }
}
