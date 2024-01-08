import { api } from '../node.js';
import { totalSupply } from './total-supply.js';
import { DECIMALS } from '../consts.js';

// ROI = era_payout / total_staked * eras_per_year
// era_payout = total_issuance * inflation_per_era

export async function stakingRoi() {
    const lastEra = (await api.query.staking.currentEra()).toHuman() - 1;

    const inflationPerEra = (await api.query.staking.erasValidatorReward(lastEra)).toJSON();
    const totalStaked = await api.query.staking.erasTotalStake(lastEra);
    const totalIssuance = await totalSupply();

    return (totalIssuance * (inflationPerEra / 10 ** DECIMALS)) / (totalStaked / 10 ** DECIMALS) * 730;
}
