import config from "../config.js";
import axios from 'axios';
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

export async function getUnvested() {
  if (lastUpdated && lastUpdated.getTime() + ONE_HOUR > Date.now()) {
    return cachedValue;
  }
  const lastBlockResult = await api.rpc.chain.getBlock()
  const lastBlockNumber = lastBlockResult.block.header.number.toBigInt();
  const events = [];
  const getEvents = page => {
    return axios.post(`${SUBSCAN_URL}/api/v2/scan/events`, {
      "module": "Balances",
      "event_id": "unlocked",
      "block_range": `${MIN_BLOCK}-${lastBlockNumber}`,
      "row": PAGE_ROWS,
      "page": page,
    }, {headers: HEADERS}).catch(err => {
      console.error(err.data);
      throw err;
    })
  }
  let page = 0;
  let res = await getEvents(page);
  while (res.data?.data?.events?.length > 0) {
    events.push(...res.data.data.events.map(s => s.event_index));
    page++;
    res = await getEvents(page);
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  let unvested = 0n;
  console.log('found events: ', events.length);
  let ind = 0;
  for (const eventIndex of events) {
    console.log(`fetching event ${eventIndex} ${ind++}/${events.length}`)
    await new Promise(resolve => setTimeout(resolve, 50))
    try {
      const eventRes = await axios.post(`${SUBSCAN_URL}/api/scan/event`, {
        "event_index": eventIndex,
      })
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
