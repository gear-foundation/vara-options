import { api } from '../node.js';
import { totalSupply } from './total-supply.js';
import { DECIMALS } from '../consts.js';

// ROI = era_payout / total_staked * eras_per_year
// era_payout = total_issuance * inflation_per_era

export async function stakingRoi() {
    const lastEra = (await api.query.staking.currentEra()).toHuman();

    const inflationPerEra = (await api.query.staking.erasValidatorReward(lastEra - 2)).toJSON();
    const totalStaked = await api.query.staking.erasTotalStake(lastEra - 2);
    const totalIssuance = await totalSupply();

    const roi = (totalIssuance * (inflationPerEra / 10 ** DECIMALS)) / (totalStaked / 10 ** DECIMALS) * 730;

    return (roi / 10 ** 8)
}
