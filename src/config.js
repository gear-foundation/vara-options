import assert from 'assert/strict';
import { config } from 'dotenv';

config();

function getEnv(name, default_) {
  const env = process.env[name] || default_;

  assert.notStrictEqual(env, undefined, `Environment variable ${name} is not set`);

  return env;
}

export default {
  network: {
    addresses: getEnv('NETWORK_ADDRESSES').split(','),
  },
  server: {
    port: Number(getEnv('PORT', '3000')),
  },
  subscan: {
    apiKey: getEnv('SUBSCAN_KEY'),
  },
};
