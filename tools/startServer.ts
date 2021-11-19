/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import dotenv from 'dotenv';
dotenv.config();

import socket from '../server/core/socket';
import express from 'express';
import router from '../server/core/router';
import onMessage from '../server/core/onMessage';
import gameLoop from '../server/core/gameLoop';
import { Map } from '../server/interfaces';

const { PORT, MAP_NAME } = process.env;
const app = express();
app.use('/', router);

// TODO: Each server will be responsible for one or more maps
let map: Map;
try {
  map = JSON.parse(
    fs.readFileSync(path.resolve(`maps/${MAP_NAME}.json`), {
      encoding: 'utf-8',
    }),
  );
} catch (err) {
  console.error(err);
  exit();
}

gameLoop(map);
app.listen(PORT ? parseInt(PORT) : 8080, '0.0.0.0', () => {
  console.info('🌎  HTTP server is listening on port %s.', PORT);
});
socket.start(PORT ? parseInt(PORT) : 8080);
socket.setMessageCallback(onMessage);
