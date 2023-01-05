import { NextApiRequest, NextApiResponse } from "next";
import { Readable } from "stream";
import Stripe from "stripe";
import { stripe } from "../../services/stripe";
import { saveSubscription } from "./_lib/manageSubscription";

// Analisa as informacoes recebidas do webhook e a traduz para uso
async function buffer(readable: Readable) {
  const chunks = [];

  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

// Precisamos exportar uma config, por padrao o next tem um formato
// especifico de entender requisicao, porem estamos recebendo uma
// stream, entao teremos que desativar o entendimento padrao do next
// sobre o que esta vindo da requisicao
export const config = {
  api: {
    bodyParser: false,
  },
};

// Define quais eventos sao relevantes para a aplicacao ouvir
const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);
export default async (req: NextApiRequest, res: NextApiResponse) => {
  // Verificamos o metodo pois queremos aceitar somente
  // requisicoes do tipo POST
  if (req.method === "POST") {
    const buf = await buffer(req);
    const secret = req.headers["stripe-signature"];

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        buf,
        secret,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook error. ${err.message}`);
    }

    const { type } = event;

    if (relevantEvents.has(type)) {
      try {
        switch (type) {
          case "customer.subscription.created":
          case "customer.subscription.updated":
          case "customer.subscription.deleted":
            const subscription = event.data.object as Stripe.Subscription;

            await saveSubscription(
              subscription.id,
              subscription.customer.toString(),
              type === "customer.subscription.created"
            );
            break;

          case "checkout.session.completed":
            const checkoutSession = event.data
              .object as Stripe.Checkout.Session;

            await saveSubscription(
              checkoutSession.subscription.toString(),
              checkoutSession.customer.toString(),
              true
            );
            break;
          default:
            throw new Error("Unhandled event.");
        }
      } catch (err) {
        // Nao retornamos status de erro para evitar que
        // o stripe fique refazendo a operacao
        return res.json({ error: "Webhook handler failed" });
      }
    }

    res.json({ received: true });
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method not allowed");
  }
};
