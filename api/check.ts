import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { name = 'World' } = req.query;
  const {
    body: { secret },
  } = req;
  return res.json({
    message: `Hello ${name}!`,
    secret,
  });
}
