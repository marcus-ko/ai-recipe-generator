// pages/api/generateImage.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt } = req.body;

  try {
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

    const data = await response.json();

    if (!data.data || !data.data[0]?.url) {
      console.error('DALL·E response:', data);
      return res.status(500).json({ error: 'No image returned from DALL·E' });
    }

    res.status(200).json({ imageUrl: data.data[0].url });
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
