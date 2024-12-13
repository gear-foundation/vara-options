import {api, deriveAddr, getBalances} from '../node.js';

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
import {totalSupply} from './total-supply.js';

const CoinbaseAddresses = [
  {
    hash: 'kGjj96gJyxuPpG2BekrcaAMBHwfHrArzv9a2urP5GfpLoAoqu',
    initialBalance: 96000000,
    months: 36,
  },
  {
    hash: 'kGhBnmPPy7yyyDG7ixg4JVsuMmGTt7wsKYstmUhRB4RkK1ZRq',
    initialBalance: 200000000,
    months: 12,
  },
  {
    hash: 'kGkfMUpUwQ99tP3Swu1zen5gU44Yf5NjK1xSsnwi5CRaik8Kz',
    initialBalance: 120000000,
    months: 12,
  },
  {
    hash: 'kGiGZ5Sa6hrxiZxZ8xD95thnnkdtfK9yy54NB7Ad4oF8DzyLp',
    initialBalance: 80000000,
    months: 12,
  },
  {
    hash: 'kGjd29r3qa9rnUQSGYHh3TiFqu8tYv6FX5am6nQ5pMRirwm7d',
    initialBalance: 64000000,
    months: 12,
  },
  {
    hash: 'kGi7MJ14UdQZx9bqXZ41NC5j21iBNNCTM2wgdMMKAHkCjtFeG',
    initialBalance: 45000000,
    months: 12,
  },
  {
    hash: 'kGhKd4t4oSpH8KpiTYcx1NSVvvRf2bSz16z3yVaYfNYfdcYba',
    initialBalance: 45000000,
    months: 12,
  },
  {
    hash: 'kGgvxgM2sJF7fWUze3fNWBWzy5momsyna7XF8MFzAWPhj2WpU',
    initialBalance: 45000000,
    months: 12,
  },
  {
    hash: 'kGiVY7G1mJkqaAjKzLnRmwCy5GcvuGQvG5mUtojhVHdLfBd1P',
    initialBalance: 9000000,
    months: 12,
  },
  {
    hash: 'kGga7DgxzLLTqn9WjtEZW5pkxYVnBPS4Rt6xK3Adqs1iKN42z',
    initialBalance: 9000000,
    months: 12,
  }
]

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
    const {perBlock, startingBlock, locked} = withType.unwrap()[0];
    const blocksDiff = lastBlockNumber - startingBlock.toBigInt();
    const unlocked = perBlock.toBigInt() * blocksDiff;
    result += locked.toBigInt() - unlocked;
  }
  const totalVesting = result / BigInt(10 ** DECIMALS);
  return Number(totalVesting);
}

// Each pool additionally has 10 or 15 derived accounts (indexes from 1 to 15)
function getPoolAddresses(poolAddr, index) {
  return [poolAddr, ...deriveAddr(poolAddr, index)];
}

function coinbaseSupply() {
  const today = new Date();
  const startDate = new Date('2024-09-12');
  const month = today.getDate() < 12 ? today.getMonth() - 1 : today.getMonth();
  const effectiveDate = new Date(today.getFullYear(), month, 12);
  const yearsDiff = effectiveDate.getFullYear() - startDate.getFullYear();
  const monthsDiff = effectiveDate.getMonth() - startDate.getMonth();
  const monthsPassed = yearsDiff * 12 + monthsDiff;

  let totalUnlocked = 0;

  for (const address of CoinbaseAddresses) {
    const {initialBalance, months} = address;
    const monthlyUnlock = initialBalance / months;
    const unlocked = Math.min(monthsPassed, months) * monthlyUnlock;
    totalUnlocked += unlocked;
  }
  return totalUnlocked;
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

  return supply - total + coinbaseSupply();
}
