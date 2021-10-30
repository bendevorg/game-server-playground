/* eslint-disable no-console */

import dotenv from 'dotenv';
dotenv.config();

import socket from '../server/core/socket';

const { PORT } = process.env;
socket.start(PORT ? parseInt(PORT) : 8080);
