import { api } from '../node.js';

export async function totalSupply() {
  const total = await api.query.balances.totalIssuance();

  const bigint = total.toBigInt() / BigInt(10 ** 12);
  return Number(bigint);
}
