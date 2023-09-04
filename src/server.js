import express from 'express';
import cors from 'cors';

import config from './config.js';
import { circulationSupply, tokensSentFromInflationPool, totalSupply } from './calculators/index.js';

const app = express();

app.use(cors());

app.get('/burned', async (req, res) => {
  tokensSentFromInflationPool()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get('/total', async (req, res) => {
  totalSupply()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.get('/circulation', async (req, res) => {
  circulationSupply()
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

export function runServer() {
  app.listen(config.server.port, () => console.log(`App is running on port ${config.server.port}`));
}
