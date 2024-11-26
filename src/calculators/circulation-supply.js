import { api, deriveAddr, getBalances } from '../node.js';

import {
  AIRDROP_POOL,
  DEVELOPER_PROJECTS_GRANTS_POOL,
  FOUNDATION_AND_ECOSYSTEM_DEVELOPMENT_POOL,
  INFLATION_OFFSETTING_POOL,
  EDUCATION_BOOTCAMP_PR_EVENT_POOL,
  PROTOCOL_DEVELOPMENT_POOL,
  PROTOCOL_RESERVE_POOL,
  VALIDATOR_INCENTIVES_POOL,
  MARKET_POOL,
  CUSTODY,
  AIRDROP_3RD_PARTY_1,
  COMMUNITY_AIRDROP_2,
  DECIMALS,
  CB_COLD_WALLETS,
  CB_REWARDS,
  GEAR_FOUNDATION_V,
  GEAR_TECH_V,
  REWARD_DISTRIBUTION_MULTISIG,
  DAPPLOCKER_VALIDATOR,
  COMMUNITY_AIRDROP_3
} from '../consts.js';
import { totalSupply } from './total-supply.js';

async function getKeys(prefix, startKey = null) {
  const result = await api.rpc.state.getKeysPaged(prefix, 1000, startKey);
  if (result.length === 1000) {
    const moreKeys = await getKeys(prefix, result[result.length - 1]);
    result.push(...moreKeys);
  }
  return result;
}

// Get all vested tokens from the chain
export async function totalVesting() {
  const prefix = api.query.vesting.vesting.keyPrefix();
  const [lastBlockResult, keys] = await Promise.all([api.rpc.chain.getBlock(), getKeys(prefix)]);
  const lastBlockNumber = lastBlockResult.block.header.number.toBigInt();

  const query = await api.rpc.state.queryStorageAt(keys);

  let result = BigInt(0);

  for (const info of query) {
    const withType = api.registry.createType('Option<Vec<PalletVestingVestingInfo>>', info);
    if (withType.isNone) {
      continue;
    }

    // unlocked info
    const { perBlock, startingBlock, locked } = withType.unwrap()[0];
    const blocksDiff = lastBlockNumber - startingBlock.toBigInt();
    const unlocked = perBlock.toBigInt() * blocksDiff;
    result += locked.toBigInt() - unlocked;
    result += locked - unlocked;
  }
  const totalVesting = result / BigInt(10 ** DECIMALS);
  return Number(totalVesting);
}

// Each pool additionally has 10 or 15 derived accounts (indexes from 1 to 15)
function getPoolAddresses(poolAddr, index) {
  return [poolAddr, ...deriveAddr(poolAddr, index)];
}

// Circulation Supply = Total Supply - (Vesting + Pools);
export async function circulationSupply() {
  const addresses = [
    ...getPoolAddresses(EDUCATION_BOOTCAMP_PR_EVENT_POOL, 15),
    ...getPoolAddresses(PROTOCOL_RESERVE_POOL),
    ...getPoolAddresses(FOUNDATION_AND_ECOSYSTEM_DEVELOPMENT_POOL),
    ...getPoolAddresses(PROTOCOL_DEVELOPMENT_POOL, 15),
    ...getPoolAddresses(VALIDATOR_INCENTIVES_POOL, 12),
    ...getPoolAddresses(DEVELOPER_PROJECTS_GRANTS_POOL, 15),
    ...getPoolAddresses(AIRDROP_POOL),
    MARKET_POOL,
    AIRDROP_3RD_PARTY_1,
    COMMUNITY_AIRDROP_2,
    INFLATION_OFFSETTING_POOL,
    ...CUSTODY,
    ...CB_COLD_WALLETS,
    CB_REWARDS,
    GEAR_TECH_V,
    DAPPLOCKER_VALIDATOR,
    GEAR_FOUNDATION_V,
    REWARD_DISTRIBUTION_MULTISIG,
    COMMUNITY_AIRDROP_3
  ];

  const [supply, vesting, pools] = await Promise.all([
    totalSupply(),
    totalVesting(),
    getBalances(addresses),
  ]);

  const total = pools.reduce((accumulator, current) => accumulator + current, 0) + vesting;

  return supply - total;
}
