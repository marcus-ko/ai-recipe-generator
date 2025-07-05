// pages/api/image-status.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { jobId } = req.query

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Missing jobId' })
  }

  const job = await redis.hgetall(jobId)
  if (!job || Object.keys(job).length === 0) {
    return res.status(404).json({ error: 'Job not found' })
  }

  return res.status(200).json(job)
}
