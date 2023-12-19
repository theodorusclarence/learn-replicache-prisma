import { WebhookEvent } from '@clerk/nextjs/server';
import { buffer } from 'micro';
import { nanoid } from 'nanoid';
import { NextApiRequest, NextApiResponse } from 'next';
import { Webhook } from 'svix';

import { prismaClient } from '@/lib/prisma.server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405);
  }
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      'Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
    );
  }

  // Get the headers
  const svix_id = req.headers['svix-id'] as string;
  const svix_timestamp = req.headers['svix-timestamp'] as string;
  const svix_signature = req.headers['svix-signature'] as string;

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Error occured -- no svix headers' });
  }

  console.info('headers', req.headers, svix_id, svix_signature, svix_timestamp);
  // Get the body
  const body = (await buffer(req)).toString();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return res.status(400).json({ Error: err });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  console.info(`Webhook with and ID of ${id} and type of ${eventType}`);
  console.info('Webhook body:', body);
  // TODO - handle the event

  // start a transaction here
  // create a space
  // create a user
  // if both succeed commit
  // else we rollback
  switch (eventType) {
    case 'user.created': {
      const data = evt.data;
      await prismaClient.$transaction(async (tx) => {
        const space = await tx.space.create({
          data: {},
        });

        await tx.user.create({
          data: {
            id: id ?? nanoid(),
            email: data.email_addresses[0].email_address,
            image: data.image_url,
            name: data.first_name,
            spaceId: space.id,
          },
        });
      });
      break;
    }
    case 'user.updated':
      break;
    case 'user.deleted':
      break;
    case 'session.created':
      break;
    default:
      break;
  }
  return res.status(200).json({ response: 'Success' });
}
