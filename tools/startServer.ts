/* eslint-disable no-console */
import { exit } from 'process';
import dotenv from 'dotenv';
dotenv.config();

import socket from '../server/core/socket';
import express from 'express';
import router from '../server/core/router';
import Map from '../server/models/map';
import onMessage from '../server/core/onMessage';
import gameLoop from '../server/core/gameLoop';
import { game } from '../server/constants';
import { maps } from '../server/cache';

const { PORT } = process.env;
const app = express();
app.use('/', router);

// TODO: Each server will be responsible for one or more maps
// TODO: This should probably be done somewhere else
if (!game.MAP_NAME) {
  console.error('Please set a map name');
  exit();
}
const map = new Map(game.MAP_NAME);
maps.set(game.MAP_NAME, map);

gameLoop(map);
app.listen(PORT ? parseInt(PORT) : 8080, '0.0.0.0', () => {
  console.info('🌎  HTTP server is listening on port %s.', PORT);
});
socket.start(PORT ? parseInt(PORT) : 8080);
socket.setMessageCallback(onMessage);
