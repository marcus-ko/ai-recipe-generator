// pages/api/start-image-generation.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Redis } from '@upstash/redis'
import { nanoid } from 'nanoid'

const redis = Redis.fromEnv()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { prompt } = req.body
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'Prompt is required.' })
  }

  const jobId = `image-job:${nanoid()}`
  await redis.hset(jobId, {
    status: 'pending',
    prompt: prompt.trim(),
    createdAt: Date.now(),
  })
  await redis.expire(jobId, 3600) // 1 hour expiration

  return res.status(202).json({ jobId })
}
