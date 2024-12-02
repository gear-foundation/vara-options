import config from "../config.js";
import {api} from "../node.js";

const SUBSCAN_URL = 'https://vara.api.subscan.io'
const MIN_BLOCK = 15800000
const ONE_HOUR = 60 * 60 * 1000;
const PAGE_ROWS = 100;

const HEADERS = {
  'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
  'Content-Type': 'application/json',
  'x-api-key': config.subscan.apiKey,
};

let cachedValue = 0n;
let lastUpdated = undefined;

function getVestExtrinsicPaginated(page, lastBlockNumber, type) {
  return fetch(`${SUBSCAN_URL}/api/v2/scan/extrinsics`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      "module": "vesting",
      "call": type,
      "block_range": `${MIN_BLOCK}-${lastBlockNumber}`,
      "row": PAGE_ROWS,
      "page": page,
    })
  })
    .then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          console.error(err);
          throw err;
        });
      }
      return response.json();
    })
    .catch(err => {
      console.error(err);
      throw err;
    });
}

async function getVestExtrinsic(type, lastBlockNumber) {
  let page = 0;
  let extrinsics = [];
  let res = await getVestExtrinsicPaginated(page, lastBlockNumber, type);
  while (res.data?.extrinsics?.length > 0) {
    extrinsics.push(...res.data.extrinsics.map(s => s.extrinsic_index));
    page++;
    res = await getVestExtrinsicPaginated(page, lastBlockNumber, type);
  }
  return extrinsics;
}

export async function getUnvested() {
  if (lastUpdated && lastUpdated.getTime() + ONE_HOUR > Date.now()) {
    return cachedValue;
  }
  const lastBlockResult = await api.rpc.chain.getBlock()
  const lastBlockNumber = lastBlockResult.block.header.number.toBigInt();
  const extrinsics = await Promise.all(
    [
      getVestExtrinsic("vest", lastBlockNumber),
      getVestExtrinsic("vest_other", lastBlockNumber),
    ]).then(res => res.flat());
  let unvested = 0n;
  console.log('found extrinsics: ', extrinsics.length);
  for (const extrinsicIndex of extrinsics) {

    try {
      const extrinsicRes = await fetch(`${SUBSCAN_URL}/api/scan/extrinsic`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          "extrinsic_index": extrinsicIndex,
        }),
      }).then(response => response.json());
      const vestingEvents = extrinsicRes.data?.event?.filter(e => {
        return e.module_id?.toLowerCase() === 'balances' && e.event_id?.toLowerCase() === 'unlocked';
      }) ?? [];
      for (let e of vestingEvents) {
        try {
          const params = JSON.parse(e.params) ?? [];
          const unvestedParams = params.filter(p => p.name === "amount");
          for (let un of unvestedParams) {
            unvested += BigInt(un.value)
          }
        } catch (e) {
          console.error(`failed to calculate unvested because of`, e);
        }
      }
    } catch (e) {
      console.error(`failed to calculate unvested because of`, e.data);
    }
  }
  lastUpdated = new Date();
  cachedValue = unvested;
  console.log('unvested: ', unvested);
  return unvested;
}

// to get cached value as soon as the server starts
setTimeout(() => getUnvested(), 30000);
