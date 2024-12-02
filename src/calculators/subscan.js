import config from '../config.js';
import { api } from '../node.js';

const SUBSCAN_URL = 'https://vara.api.subscan.io';
const ONE_HOUR = 60 * 60 * 1000;
const PAGE_ROWS = 100;

const HEADERS = {
  'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
  'Content-Type': 'application/json',
  'x-api-key': config.subscan.apiKey,
};

let minBlock = 17827639;
let cachedValue = 184056079261254986960n;
let lastUpdated = undefined;

const exchangeAddresses = [
  'kGjj96gJyxuPpG2BekrcaAMBHwfHrArzv9a2urP5GfpLoAoqu',
  'kGhBnmPPy7yyyDG7ixg4JVsuMmGTt7wsKYstmUhRB4RkK1ZRq',
  'kGkfMUpUwQ99tP3Swu1zen5gU44Yf5NjK1xSsnwi5CRaik8Kz',
  'kGiGZ5Sa6hrxiZxZ8xD95thnnkdtfK9yy54NB7Ad4oF8DzyLp',
  'kGjd29r3qa9rnUQSGYHh3TiFqu8tYv6FX5am6nQ5pMRirwm7d',
  'kGi7MJ14UdQZx9bqXZ41NC5j21iBNNCTM2wgdMMKAHkCjtFeG',
  'kGhKd4t4oSpH8KpiTYcx1NSVvvRf2bSz16z3yVaYfNYfdcYba',
  'kGgvxgM2sJF7fWUze3fNWBWzy5momsyna7XF8MFzAWPhj2WpU',
  'kGiVY7G1mJkqaAjKzLnRmwCy5GcvuGQvG5mUtojhVHdLfBd1P',
  'kGga7DgxzLLTqn9WjtEZW5pkxYVnBPS4Rt6xK3Adqs1iKN42z',
];

function getVestExtrinsicPaginated(page, lastBlockNumber, type) {
  return fetch(`${SUBSCAN_URL}/api/v2/scan/extrinsics`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      module: 'vesting',
      call: type,
      block_range: `${minBlock}-${lastBlockNumber}`,
      row: PAGE_ROWS,
      page: page,
    }),
  }).then((response) => {
    if (!response.ok) {
      return response.json().then((err) => {
        throw err;
      });
    }
    return response.json();
  });
}

async function getVestExtrinsic(type, lastBlockNumber) {
  let page = 0;
  let extrinsics = [];
  let res = await getVestExtrinsicPaginated(page, lastBlockNumber, type);
  while (res.data?.extrinsics?.length > 0) {
    extrinsics.push(...res.data.extrinsics.map((s) => s.extrinsic_index));
    page++;
    res = await getVestExtrinsicPaginated(page, lastBlockNumber, type);
  }
  return extrinsics;
}

async function getExchangeAddresses(lastBlockNumber) {
  let sum = 0n;
  for (let address of exchangeAddresses) {
    const res = await fetch(`${SUBSCAN_URL}/api/v2/scan/transfers`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        address: address,
        direction: 'all',
        order: 'asc',
        include_total: true,
        page: 0,
        row: 1,
        block_range: `${minBlock}-${lastBlockNumber}`,
        success: true,
        token_category: ['native'],
      }),
    }).then((response) => response.json());
    sum += BigInt(res?.data?.total?.VARA?.sent ?? 0n);
  }
  return sum;
}

export async function getUnvested() {
  if (cachedValue > 0n) {
    return cachedValue;
  }
  return updateUnvested();
}

async function updateUnvested() {
  const lastBlockResult = await api.rpc.chain.getBlock();
  const lastBlockNumber = lastBlockResult.block.header.number.toBigInt();
  const extrinsics = await Promise.all([
    getVestExtrinsic('vest', lastBlockNumber),
    getVestExtrinsic('vest_other', lastBlockNumber),
  ]).then((res) => res.flat());
  let unvested = cachedValue;
  console.log('found extrinsics: ', extrinsics.length);
  for (const extrinsicIndex of extrinsics) {
    try {
      const extrinsicRes = await fetch(`${SUBSCAN_URL}/api/scan/extrinsic`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          extrinsic_index: extrinsicIndex,
        }),
      }).then((response) => response.json());
      const vestingEvents =
        extrinsicRes.data?.event?.filter((e) => {
          return e.module_id?.toLowerCase() === 'balances' && e.event_id?.toLowerCase() === 'unlocked';
        }) ?? [];
      for (let e of vestingEvents) {
        try {
          const params = JSON.parse(e.params) ?? [];
          const unvestedParams = params.filter((p) => p.name === 'amount');
          for (let un of unvestedParams) {
            unvested += BigInt(un.value);
          }
        } catch (e) {
          console.error(`failed to calculate unvested because of`, e);
        }
      }
    } catch (e) {
      console.error(`failed to calculate unvested because of`, e.data);
    }
  }
  unvested += await getExchangeAddresses(lastBlockNumber);
  lastUpdated = new Date();
  cachedValue = unvested;
  console.log(`unvested for blockNumber ${lastBlockNumber}: `, unvested);
  minBlock = Number(lastBlockNumber) + 1;
  return unvested;
}

// to get cached value as soon as the server starts
setTimeout(() => updateUnvested(), 10000);
setInterval(() => updateUnvested(), ONE_HOUR);
