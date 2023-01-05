import { fauna } from "../../../services/fauna";
import { stripe } from "../../../services/stripe";
import { query as q } from "faunadb";

// Informacoes a serem salvas no banco de dados
export async function saveSubscription(
  subscriptionId: string,
  customerId: string,
  createAction = false
) {
  // Buscar o usuario no FaunaDB com o id {customerId}
  const userRef = await fauna.query(
    q.Select(
      "ref",
      q.Get(q.Match(q.Index("user_by_stripe_customer_id"), customerId))
    )
  );
  // Salvar os dados da subscription no FaunaDB
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const subscriptionData = {
    id: subscription.id,
    userId: userRef,
    status: subscription.status,
    price_id: subscription.items.data[0].price.id,
  };

  if (createAction) {
    await fauna.query(
      q.Create(q.Collection("subscriptions"), { data: subscriptionData })
    );
  } else {
    await fauna.query(
      q.Replace(
        q.Select(
          "ref",
          q.Get(q.Match(q.Index("subscription_by_id"), subscriptionId))
        ),
        { data: subscriptionData }
      )
    );
  }
}
