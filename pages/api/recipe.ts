import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { ingredients } = req.body;

  const prompt = `Give me 2 easy recipes using these ingredients: ${ingredients}. Include ingredients and step-by-step instructions.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Unknown error' });
    }

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('Unexpected OpenAI response format:', data);
      return res.status(500).json({ error: 'Invalid response from OpenAI API' });
    }

    res.status(200).json({ result: data.choices[0].message.content });
  } catch (error: any) {
    console.error('Request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
