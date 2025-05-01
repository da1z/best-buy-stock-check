import { verifySignature } from '@upstash/qstash/nextjs';
import { waitUntil } from '@vercel/functions';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend();

type BestBuyProduct = {
  sku: number;
  name: string;
  addToCartUrl: string;
  orderable: 'Available' | 'ComingSoon';
  onlineAvailability: boolean;
  inStoreAvailability: boolean;
};

const fetchProduct = async (sku: string) => {
  const response = await fetch(
    `https://api.bestbuy.com/v1/products/${sku}.json?apiKey=${process.env.BESTBUY_API_KEY}`
  );
  const data: BestBuyProduct = await response.json();
  return data;
};

async function handler(req: VercelRequest, res: VercelResponse) {
  let sku: string | string[] = req.body.sku;
  sku = Array.isArray(sku) ? sku : [sku];
  const products = await Promise.all(sku.map(fetchProduct));

  for (const product of products) {
    if (
      product.orderable === 'Available' ||
      product.inStoreAvailability ||
      product.onlineAvailability
    ) {
      waitUntil(
        resend.emails.send({
          from: `Best Buy Stock Check <${process.env.EMAIL_FROM}>`,
          to: [process.env.EMAIL_TO!],
          subject: `Available!!! ${product.name}`,
          html: `<p>The product ${product.name} is available at Best Buy.</p>
          <p>Add to cart: <a href="${product.addToCartUrl}">${
            product.addToCartUrl
          }</a></p>
          <p>Raw data: ${JSON.stringify(product)}</p>`,
        })
      );
    }
  }
  return res.status(200).json({ message: 'Message processed successfully' });
}

export default verifySignature(handler);
