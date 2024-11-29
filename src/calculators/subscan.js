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
  const extrinsics = [];
  const getExtrinsics = page => {
    return axios.post(`${SUBSCAN_URL}/api/v2/scan/extrinsics`, {
      "module": "vesting",
      "call": "vest",
      "block_range": `${MIN_BLOCK}-${lastBlockNumber}`,
      "row": PAGE_ROWS,
      "page": page,
    }, {headers: HEADERS})
  }
  let page = 0;
  let res = await getExtrinsics(page);
  while (res.data?.data?.extrinsics?.length > 0) {
    extrinsics.push(...res.data.data.extrinsics.map(s => s.extrinsic_index));
    page++;
    res = await getExtrinsics(page);
  }
  let unvested = 0n;
  for (const extrinsicIndex of extrinsics) {
    const extrinsicRes = await axios.post(`${SUBSCAN_URL}/api/scan/extrinsic`, {
      "extrinsic_index": extrinsicIndex,
    })
    const vestingEvents = extrinsicRes.data.data?.event?.filter(e => e.module_id === 'vesting' && e.event_id === 'VestingUpdated') ?? [];
    for (let e of vestingEvents) {
      try {
        const params = JSON.parse(e.params) ?? [];
        const unvestedParams = params.filter(p => p.name === "unvested");
        for (let un of unvestedParams) {
          unvested += BigInt(un.value)
        }
      } catch (e) {
        console.error(`failed to calculate unvested because of`, e);
      }
    }
  }
  lastUpdated = new Date();
  cachedValue = unvested;
  return unvested;
}


// to get cached value as soon as the server starts
setTimeout(() => getUnvested(), 10000);
