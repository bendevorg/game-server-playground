import sendSnapshots from '~/controllers/sendSnapshots';
import { engine } from '~/constants';

const sendLoop = async () => {
  setTimeout(() => sendLoop(), 1000 / engine.SEND_TICK_RATE);
  sendSnapshots(true);
};

export default sendLoop;
