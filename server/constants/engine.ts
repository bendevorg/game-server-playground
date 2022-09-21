export default {
  DEV_MODE: process.env.NODE_ENV === 'development',
  GAME_TICK_RATE: 33,
  SEND_TICK_RATE: 10,
  MAX_DISTANCE_TO_ACCEPT_SYNC: 0.2,
  // THIS SHOULD ONLY BE USED TO TEST
  LATENCY: 0,
};
