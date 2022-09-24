import randomFromInterval from '~/utils/randomFromInterval';

export default function randomIntFromInterval(min: number, max: number) {
  return Math.floor(randomFromInterval(min, max));
}
