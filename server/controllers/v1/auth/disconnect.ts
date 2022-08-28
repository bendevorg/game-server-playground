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

import { Request, Response } from 'express';
import { players } from '~/cache';

export default async (req: Request, res: Response) => {
  // TODO: We should never receive the ID like this of course
  // We should get an encrypted token that the user got when they logged in
  // And get the ID from there. This is just a placeholder for now
  const { id } = req.body;
  players.del(id);
  return res.status(200).json();
};
