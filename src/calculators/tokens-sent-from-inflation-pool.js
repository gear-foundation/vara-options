import { INFLATION_OFFSETTING_POOL, INITIAL_BALANCE_INFLATION_OFFSETTING_POOL } from '../consts.js';
import { getBalance } from '../node.js';

export async function tokensSentFromInflationPool() {
  const balance = await getBalance(INFLATION_OFFSETTING_POOL);
  return INITIAL_BALANCE_INFLATION_OFFSETTING_POOL - Number(balance);
}
