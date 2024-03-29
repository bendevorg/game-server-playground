/* eslint-disable no-console */
import 'module-alias/register';
import { exit } from 'process';
import dotenv from 'dotenv';
dotenv.config();

import socket from '~/core/socket';
import express from 'express';
import router from '~/core/router';
import Map from '~/models/map';
import onMessage from '~/core/onMessage';
import gameLoop from '~/core/gameLoop';
import sendLoop from '~/core/sendLoop';
import { game } from '~/constants';
import { maps } from '~/cache';
// Importing so the database authenticates
import database from '~/models';

const { PORT } = process.env;
const { SOCKET_PORT } = process.env;
const app = express();
app.use('/', router);

// TODO: Eventually each server will be responsible for one or more maps
// TODO: This should probably be done somewhere else
if (!game.MAP_NAME) {
  console.error('Please set a map name');
  exit();
}
const map = new Map(game.MAP_NAME);
maps.set(game.MAP_NAME, map);

gameLoop(map);
sendLoop();
app.listen(PORT ? parseInt(PORT) : 8080, '0.0.0.0', () => {
  console.info('🌎  HTTP server is listening on port %s.', PORT);
});
socket.start(SOCKET_PORT ? parseInt(SOCKET_PORT) : 5600);
socket.setMessageCallback(onMessage);
