import { NextApiRequest, NextApiResponse } from "next";
import { query as q } from "faunadb";
import { getSession } from "next-auth/react";
import { fauna } from "../../services/fauna";
import { stripe } from "../../services/stripe";

type User = {
  ref: {
    id: string;
  };
  data: {
    stripe_customer_id: string;
  };
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // Verificamos o metodo pois queremos aceitar somente
  // requisicoes do tipo POST, pois estamos criando algo
  if (req.method === "POST") {
    // Resgatando informacoes dos cookies,
    // necessario para session user
    const session = await getSession({ req });
    const mail = session.user.email;

    const user = await fauna.query<User>(
      q.Get(q.Match(q.Index("user_by_email"), q.Casefold(mail)))
    );

    // Essa variavel pega o customer id que ja existe no banco
    let customerId = user.data.stripe_customer_id;
    // Se ela nao existir ele cria um novo customer
    if (!customerId) {
      // Cadastrando user no stripe
      const stripeCustomer = await stripe.customers.create({
        email: session.user.email,
        // metadata:
      });

      // Evitando duplicacao de customer no stripe e salvando no banco
      await fauna.query(
        q.Update(q.Ref(q.Collection("users"), user.ref.id), {
          data: {
            stripe_customer_id: stripeCustomer.id,
          },
        })
      );
      // Reatribui a variavel para ela sempre ter um valor
      customerId = stripeCustomer.id;
    }

    const stripeCheckoutSession = await stripe.checkout.sessions.create({
      // Criando cliente no painel do stripe:
      customer: customerId,
      // Definimos cartao pois é o metodo
      // mais usado em assinaturas
      payment_method_types: ["card"],
      // Podemos deixar auto e depois configurar dentro
      // do painel do stripe, porem neste projetos iremos
      // necessitar deste dado posteriomente
      billing_address_collection: "required",
      // Itens dentro do carrinho
      line_items: [{ price: "price_1M9twLIapDOKa5f3DeiSnAZ8", quantity: 1 }],
      // Metodo de pagamento
      mode: "subscription",
      // Permitiremos o uso de cupons de codigo
      allow_promotion_codes: true,
      // Quando der sucesso, para onde redirecionar o usuario
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL,
    });
    // Retorna resultado OK com um json recebendo um ID deste checkout
    // usaremos a API do stripe para converter este ID em uma URL, e depois
    // redirecionar o usuario para esta URL e depois direcionado de volta
    return res.status(200).json({ sessionId: stripeCheckoutSession.id });
  } else {
    // Explicando para o front-end que o metodo que esta
    // rota aceita é POST
    res.setHeader("Allow", "POST");
    res.status(405).end("Method not allowed");
  }
};
