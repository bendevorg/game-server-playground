import joi from 'joi';
import { Request, Response, NextFunction } from 'express';

const schema = joi.object().keys({
  id: joi.number().required(),
});

export default (req: Request, _res: Response, next: NextFunction) => {
  const { error }: joi.ValidationResult = schema.validate(req.body);
  if (!error) {
    return next();
  }
  return next(error);
};
