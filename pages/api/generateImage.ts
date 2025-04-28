// pages/api/generateImage.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { prompt } = req.body
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

    // Set 24h expiry on first increment
    if (ipCount === 1) await redis.expire(ipKey, 86400)
    if (globalCount === 1) await redis.expire(globalKey, 86400)

    if (ipCount > 5) {
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
    
    if (!response.ok) {
      const errorText = await response.text(); // safely read error message
      console.error('OpenAI error response:', errorText);
      return res.status(response.status).json({ error: 'OpenAI image generation failed.' });
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data[0]?.url) {
      console.error('DALL·E response:', data);
      return res.status(500).json({ error: 'No image returned from DALL·E' });
    }
    
    res.status(200).json({ imageUrl: data.data[0].url });
    
  } catch (error: unknown) {
    console.error('Image generation error:', error);
  
    return res.status(500).json({
      error: 'An error occurred while generating the image.',
    });
  }
}
