/**
 * @api {POST} /auth/disconnect POST Disconnect
 * @apiName Disconnect
 * @apiGroup Auth
 * @apiVersion 0.0.1
 *
 * @apiParam {String} id User's id
 * @apiParamExample {json} Request-example:
 * {
 *     "id": "Test",
 * }
 * @apiSuccess (200) {String} data Authorization ID.
 * @apiSuccessExample {json} Success-Response:
    {}
 * @apiError (400) {String} msg Error message.
 * @apiErrorExample {json} Error-Response:
    { "data": "example is missing or is not correctly formatted." }
  *
 */

import { NextFunction, Request, Response } from 'express';
import { Player } from '~/models';
import { NotFound } from '~/errors';

export default async (req: Request, res: Response, next: NextFunction) => {
  // TODO: We should never receive the ID like this of course
  // We should get an encrypted token that the user got when they logged in
  // And get the ID from there. This is just a placeholder for now
  const { id } = req.body;
  const player = Player.getActive(id);
  if (!player) return next(new NotFound());
  player.disconnect();
  return res.status(200).json();
};
