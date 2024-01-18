import express from 'express';
import cors from 'cors';

import config from './config.js';
import {
  circulationSupply,
  tokensSentFromInflationPool,
  totalStaking,
  totalSupply,
  totalVesting,
  stakingRoi
} from './calculators/index.js';

const app = express();

app.use(cors());

app.get('/api2/burned', async (req, res) => {
  tokensSentFromInflationPool()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get('/api2/total', async (req, res) => {
  totalSupply()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get('/api2/total-staking', async (req, res) => {
  totalStaking()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get('/api2/total-vesting', async (req, res) => {
  totalVesting()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get('/api2/circulating-supply', async (req, res) => {
  circulationSupply()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get('/api2/roi', async (req, res) => {
  stakingRoi()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

export function runServer() {
  app.listen(config.server.port, () => console.log(`App is running on port ${config.server.port}`));
}
