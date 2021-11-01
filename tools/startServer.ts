/* eslint-disable no-console */

import dotenv from 'dotenv';
dotenv.config();

import socket from '../server/core/socket';
import express from 'express';
import router from '../server/core/router';

const { PORT } = process.env;
const app = express();
app.use('/', router);

app.listen(PORT ? parseInt(PORT) : 8080, '0.0.0.0', () => {
  console.info('🌎  HTTP server is listening on port %s.', PORT);
});
socket.start(PORT ? parseInt(PORT) : 8080);
