// pages/api/generateImage.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { prompt } = req.body

  // 🧠 Validate prompt
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    console.error('❌ Invalid prompt received:', prompt);
    return res.status(400).json({ error: 'Prompt is required and must be a non-empty string.' });
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

    if (ipCount > 2) {
      return res
        .status(429)
        .json({ error: 'You have reached your daily limit (2 images per IP).' })
    }

    if (globalCount > 6) {
      return res
        .status(429)
        .json({ error: 'Global image generation limit reached. Try again tomorrow.' })
    }

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
    });

    const contentType
