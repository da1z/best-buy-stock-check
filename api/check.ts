import { verifySignature } from '@upstash/qstash/nextjs';
import { waitUntil } from '@vercel/functions';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend();

type BestBuyProduct = {
  sku: number;
  name: string;
  addToCartUrl: string;
  url: string;
  orderable: 'Available' | 'ComingSoon';
  onlineAvailability: boolean;
  inStoreAvailability: boolean;
};

const fetchProduct = async (sku: string) => {
  console.log(`Fetching product SKU: ${sku}`);
  try {
    const response = await fetch(
      `https://api.bestbuy.com/v1/products/${sku}.json?apiKey=${process.env.BESTBUY_API_KEY}`
    );
    const data: BestBuyProduct = await response.json();
    console.log(`Successfully fetched product: ${data.name}`);
    return data;
  } catch (error) {
    console.error(`Error fetching product ${sku}:`, error);
    throw error;
  }
};

async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Starting stock check');
  let sku: string | string[] = req.body.sku;
  sku = Array.isArray(sku) ? sku : [sku];
  console.log(`Checking SKUs: ${sku.join(', ')}`);

  const products = await Promise.all(sku.map(fetchProduct));

  for (const product of products.map(
    ({
      sku,
      name,
      addToCartUrl,
      url,
      orderable,
      onlineAvailability,
      inStoreAvailability,
    }) => ({
      sku,
      name,
      addToCartUrl,
      url,
      orderable,
      onlineAvailability,
      inStoreAvailability,
    })
  )) {
    console.log(`Checking availability for ${product.name}:`, {
      orderable: product.orderable,
      onlineAvailability: product.onlineAvailability,
      inStoreAvailability: product.inStoreAvailability,
    });

    if (
      product.orderable === 'Available' ||
      product.inStoreAvailability ||
      product.onlineAvailability
    ) {
      console.log('Product is available');
      waitUntil(
        resend.emails.send({
          from: `Best Buy Stock Check <${process.env.EMAIL_FROM}>`,
          to: [process.env.EMAIL_TO!],
          subject: `Available!!! ${product.name}`,
          html: `<p>The product ${product.name} is available at Best Buy.</p>
          <p>Add to cart: <a href="${product.addToCartUrl}">${
            product.addToCartUrl
          }</a></p>
          <p>Product page: <a href="${product.url}">${product.url}</a></p>
          <p>Raw data: ${JSON.stringify(product)}</p>`,
        })
      );
    }
  }
  console.log('Stock check completed');
  return res.status(200).json({ message: 'Message processed successfully' });
}

export default verifySignature(handler);
