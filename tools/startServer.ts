/* eslint-disable no-console */
import { exit } from 'process';
import dotenv from 'dotenv';
dotenv.config();

import socket from '../server/core/socket';
import express from 'express';
import router from '../server/core/router';
import onMessage from '../server/core/onMessage';
import initializeMap from '../server/core/initializeMap';
import gameLoop from '../server/core/gameLoop';

const { PORT } = process.env;
const app = express();
app.use('/', router);

// TODO: Each server will be responsible for one or more maps
const map = initializeMap();
if (!map) {
  console.error('Failed to initialize map.');
  exit();
}
gameLoop(map);
app.listen(PORT ? parseInt(PORT) : 8080, '0.0.0.0', () => {
  console.info('🌎  HTTP server is listening on port %s.', PORT);
});
socket.start(PORT ? parseInt(PORT) : 8080);
socket.setMessageCallback(onMessage);
