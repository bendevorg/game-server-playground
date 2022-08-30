import { createClient } from 'redis';
import logger from 'log-champ';

const client = createClient();
client.on('error', (error) => logger.error(error));
client.connect();

export default client;
