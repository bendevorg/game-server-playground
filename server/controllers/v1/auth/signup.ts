/**
 * @api {POST} /auth/signup POST Signup
 * @apiName Signup
 * @apiGroup Auth
 * @apiVersion 0.0.1
 *
 * @apiParam {String} username Username
 * @apiParam {String} password User's password
 * @apiParamExample {json} Request-example:
 * {
 *     "username": "Test",
 *     "password": "Test"
 * }
 * @apiSuccess (200) {String} data Authorization ID.
 * @apiSuccessExample {json} Success-Response:
    { "data": "dasdasd-123123-asdf-xcvz-" }
 * @apiError (400) {String} msg Error message.
 * @apiErrorExample {json} Error-Response:
    { "data": "example is missing or is not correctly formatted." }
  *
 */

import { NextFunction, Request, Response } from 'express';
import { User } from '~/models';
import { UnexpectedError } from '~/errors';

// This API will need to be done properly eventually
// Right now I am just adding the bare minimum so we can create users
export default async (req: Request, res: Response, next: NextFunction) => {
  const { username } = req.body;
  // TODO: Use hashed password
  // TODO: We should check if the user exists and then try to create
  let createData = null;
  try {
    createData = await User.getOrCreate(username);
  } catch (err) {
    return next(new UnexpectedError());
  }
  if (createData == null) return next(new UnexpectedError());
  const [user, created] = createData;
  if (!created) return res.status(200).json();
  await user.newCharacter(username);
  return res.status(200).json();
};
