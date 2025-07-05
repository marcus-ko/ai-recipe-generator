// pages/api/run-image-worker.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  const keys = await redis.keys('image-job:*')

  for (const key of keys) {
    const job = await redis.hgetall(key)
    if (job.status !== 'pending') continue

    try {
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
      })

      const data = await response.json()
      const imageUrl = data?.data?.[0]?.url

      if (imageUrl) {
        await redis.hset(key, { status: 'complete', imageUrl })
      } else {
        await redis.hset(key, { status: 'error', error: 'Image not generated' })
      }
    } catch (err) {
      console.error('Image generation failed:', err)
      await redis.hset(key, { status: 'error', error: 'Image generation error' })
    }
  }

  return res.status(200).json({ processed: keys.length })
}
