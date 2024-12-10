import { api } from '../node.js';
import { totalSupply } from './total-supply.js';
import { DECIMALS } from '../consts.js';

// ROI = era_payout / total_staked * eras_per_year
// era_payout = total_issuance * inflation_per_era

export async function stakingRoi() {
  const lastEra = (await api.query.staking.currentEra()).unwrap().toNumber();

  const inflationPerEra = (await api.query.staking.erasValidatorReward(lastEra - 2)).unwrap().toBigInt();

  const totalStaked = (await api.query.staking.erasTotalStake(lastEra - 2)).toBigInt();

  const totalIssuance = BigInt(await totalSupply());

  const roi =
    ((totalIssuance * (inflationPerEra / BigInt(10 ** DECIMALS))) / (totalStaked / BigInt(10 ** DECIMALS))) * 730n;

  return Number(roi / BigInt(10 ** 8));
}
