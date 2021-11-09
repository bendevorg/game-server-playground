/**
 * @api {POST} /auth/login POST Login
 * @apiName Login
 * @apiGroup Auth
 * @apiVersion 0.0.1
 *
 * @apiParam {String} login User's data
 * @apiParam {String} password User's password
 * @apiParamExample {json} Request-example:
 * {
 *     "login": "Test",
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

import { Request, Response } from 'express';
import uuid4 from 'uuid4';
import generateSnapshot from '../../../controllers/generateSnapshot';
import cache from '../../../utils/cache';
import { Player } from '../../../interfaces';
import { cache as constants } from '../../../constants';

export default async (req: Request, res: Response) => {
  // TODO: Login will return the current game snapshot
  // In the future this info will be returned by the select character or something like that

  // TODO: Get this from the database
  const id = uuid4();
  const { ip } = req;
  // TODO: Get from cache -> redis -> database
  const player: Player | undefined = cache.get<Player>(id);
  cache.set(
    id,
    player !== undefined
      ? { ...player, ip }
      : // TODO: Get this from the database
        { id, ip, positionX: 3, positionY: 0.5, positionZ: -3, speed: 5 },
  );
  const snapshot = await generateSnapshot();
  return res.status(200).json({ id, snapshot });
};
