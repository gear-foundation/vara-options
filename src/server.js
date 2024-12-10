import express from 'express';
import cors from 'cors';

import config from './config.js';
import {
  circulationSupply,
  tokensSentFromInflationPool,
  totalSupply,
  totalVesting,
  stakingRoi,
} from './calculators/index.js';

const app = express();

app.use(cors());

app.get('/api/burned', async (req, res) => {
  tokensSentFromInflationPool()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get('/api/total', async (req, res) => {
  totalSupply()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

// app.get('/api/total-staking', async (req, res) => {
//   totalStaking()
//     .then((result) => res.json(result))
//     .catch((err) => {
//       console.error(err);
//       res.sendStatus(500);
//     });
// });

app.get('/api/total-vesting', async (req, res) => {
  totalVesting()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get('/api/circulating-supply', async (req, res) => {
  circulationSupply()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get('/api/roi', async (req, res) => {
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
