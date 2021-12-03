import Hashids from 'hashids';

const hasher = new Hashids('Player', 5);
export default hasher;
