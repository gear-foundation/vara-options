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
} from '../consts.js';
import { totalSupply } from './total-supply.js';

async function getKeys(prefix) {
  const result = await api.rpc.state.getKeysPaged(prefix, 1000, prefix);
  if (result.length === 1000) {
    const moreKeys = await getKeys(prefix);
    result.push(...moreKeys);
  }
  return result;
}

// Get all vested tokens from the chain
async function vestingTotal() {
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
  const totalVesting = result / BigInt(10 ** 12);
  return Number(totalVesting);
}

// Get all pool addresses
// Each pool additionally has 10 derived accounts (indexes from 1 to 10)
function getPoolAddresses(poolAddr) {
  return [poolAddr, ...deriveAddr(poolAddr)];
}

// Circulation Supply = Total Supply - (Vesting + Pools);
export async function circulationSupply() {
  const addresses = [
    ...getPoolAddresses(EDUCATION_BOOTCAMP_PR_EVENT_POOL),
    ...getPoolAddresses(PROTOCOL_RESERVE_POOL),
    ...getPoolAddresses(FOUNDATION_AND_ECOSYSTEM_DEVELOPMENT_POOL),
    ...getPoolAddresses(PROTOCOL_DEVELOPMENT_POOL),
    ...getPoolAddresses(VALIDATOR_INCENTIVES_POOL),
    ...getPoolAddresses(DEVELOPER_PROJECTS_GRANTS_POOL),
    ...getPoolAddresses(AIRDROP_POOL),
    INFLATION_OFFSETTING_POOL,
  ];

  const [vesting, pools, supply] = await Promise.all([vestingTotal(), getBalances(addresses), totalSupply()]);
  console.log(addresses);
  console.log(pools);

  const total = pools.reduce((accumulator, current) => accumulator + current, 0) + vesting;

  return supply - total;
}
