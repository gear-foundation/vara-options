import { ApiPromise, WsProvider } from '@polkadot/api';
import { encodeAddress } from '@polkadot/keyring';
import { encodeDerivedAddress } from '@polkadot/util-crypto';
import config from './config.js';

const provider = new WsProvider(config.network.addresses, 10000);

export let api = new ApiPromise({ provider });

export async function connect() {
  await api.isReadyOrError;
  api.once('disconnected', () => {
    api = new ApiPromise({ provider });
    connect();
  });
}

export async function getBalance(addr) {
  const account = await api.query.system.account(addr);
  return Number(account.data.free.toBigInt() / BigInt(10 ** 12));
}

export async function getBalances(addresses) {
  const accounts = await api.queryMulti(addresses.map((addr) => [api.query.system.account, addr]));
  const result = accounts.map(({ data: { free } }) => Number(free.toBigInt() / BigInt(10 ** 12)));

  return result;
}

export const deriveAddr = (addr, deriveCount = 10) => {
  const accounts = [];
  for (let deriveIndex = 1; deriveIndex <= deriveCount; deriveIndex++) {
    accounts.push(encodeAddress(encodeDerivedAddress(addr, deriveIndex), 137));
  }
  return accounts;
};
