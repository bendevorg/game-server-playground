import { errors } from '~/constants';

export default class NotFound extends Error {
  constructor(...args: any[]) {
    super(...args);
    this.name = errors.name.NOT_FOUND;
    Error.captureStackTrace(this, NotFound);
  }
}
