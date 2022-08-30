import { errors } from '~/constants';

export default class UnexpectedError extends Error {
  constructor(...args: any[]) {
    super(...args);
    this.name = errors.name.VALIDATION_ERROR;
    Error.captureStackTrace(this, UnexpectedError);
  }
}
