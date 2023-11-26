import { api, getBalances } from '../node.js';
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
  DECIMALS,
  SENT_TO_CB,
} from '../consts.js';
import { totalSupply } from './total-supply.js';

const STAKING_HEX = '0x7374616b696e6720';

async function getKeys(prefix) {
  const result = await api.rpc.state.getKeysPaged(prefix, 1000, prefix);
  if (result.length === 1000) {
    const moreKeys = await getKeys(prefix);
    result.push(...moreKeys);
  }
  return result;
}

// Get all vested tokens from the chain
export async function totalVesting() {
  const prefix = api.query.vesting.vesting.keyPrefix();
  const keys = await getKeys(prefix);

  const query = await api.rpc.state.queryStorageAt(keys);

  let result = BigInt(0);

  for (const info of query) {
    const withType = api.registry.createType('Option<Vec<PalletVestingVestingInfo>>', info);
    if (withType.isNone) {
      continue;
    }
    const locked = withType.unwrap()[0].locked.toBigInt();
    result += locked;
  }
  const totalVesting = result / BigInt(10 ** DECIMALS);
  return Number(totalVesting);
}

export async function totalStaking() {
  const prefix = api.query.balances.locks.keyPrefix();
  const keys = await getKeys(prefix);
  const allLocks = await api.rpc.state.queryStorageAt(keys);

  let total = BigInt(0);

  for (const lock of allLocks) {
    const withType = api.registry.createType('PalletBalancesBalanceLock', lock.toU8a().slice(2));

    if (withType.id.toHex() == STAKING_HEX) {
      total += withType.amount.toBigInt();
    }
  }
  const totalStaking = total / BigInt(10 ** DECIMALS);
  return Number(totalStaking);
}

// Get all pool addresses
// Each pool additionally has 10 derived accounts (indexes from 1 to 10)
// function getPoolAddresses(poolAddr) {
//   return [poolAddr, ...deriveAddr(poolAddr)];
// }

// Circulation Supply = Total Supply - (Vesting + Staking + Pools);
export async function circulationSupply() {
  const addresses = [
    EDUCATION_BOOTCAMP_PR_EVENT_POOL,
    PROTOCOL_RESERVE_POOL,
    FOUNDATION_AND_ECOSYSTEM_DEVELOPMENT_POOL,
    PROTOCOL_DEVELOPMENT_POOL,
    VALIDATOR_INCENTIVES_POOL,
    DEVELOPER_PROJECTS_GRANTS_POOL,
    AIRDROP_POOL,
    MARKET_POOL,
    AIRDROP_3RD_PARTY_1,
    INFLATION_OFFSETTING_POOL,
    ...CUSTODY,
  ];

  const [supply, vesting, staking, pools] = await Promise.all([
    totalSupply(),
    totalVesting(),
    totalStaking(),
    getBalances(addresses),
  ]);

  const total = pools.reduce((accumulator, current) => accumulator + current, 0) + vesting + staking + SENT_TO_CB;

  return supply - total;
}
