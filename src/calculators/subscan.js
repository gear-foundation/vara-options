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

function getUnlockedEvents(page, lastBlockNumber) {
  return fetch(`${SUBSCAN_URL}/api/v2/scan/events`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      "module": "Balances",
      "event_id": "unlocked",
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

export async function getUnvested() {
  if (lastUpdated && lastUpdated.getTime() + ONE_HOUR > Date.now()) {
    return cachedValue;
  }
  const lastBlockResult = await api.rpc.chain.getBlock()
  const lastBlockNumber = lastBlockResult.block.header.number.toBigInt();
  const events = [];
  let page = 0;
  let res = await getUnlockedEvents(page, lastBlockNumber);
  while (res.data?.data?.events?.length > 0) {
    events.push(...res.data.data.events.map(s => s.event_index));
    page++;
    res = await getUnlockedEvents(page, lastBlockNumber);
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  let unvested = 0n;
  console.log('found events: ', events.length);
  for (const eventIndex of events) {
    await new Promise(resolve => setTimeout(resolve, 50))
    try {
      const eventRes = await fetch(`${SUBSCAN_URL}/api/scan/event`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          "event_index": eventIndex,
        }),
      }).then(response => response.json());
      const params = eventRes.data.data.params;
      const unvestedParams = params.filter(p => p.name === "amount");
      for (let un of unvestedParams) {
        unvested += BigInt(un.value)
      }
    } catch (e) {
      console.error(`failed to calculate unvested because of`, e.data);
    }
  }
  lastUpdated = new Date();
  cachedValue = unvested;
  return unvested;
}


// to get cached value as soon as the server starts
setTimeout(() => getUnvested(), 30000);
