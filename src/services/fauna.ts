import { Client } from 'faunadb';

// Pegar acesso ao banco de dados
export const fauna = new Client({
  secret: process.env.FAUNADB_KEY,
})