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
import { players, maps } from '../../../cache';
import { Player, Map } from '../../../models';
import { game } from '../../../constants';

export default async (req: Request, res: Response) => {
  // In the future this info will be returned by the select character or something like that
  // TODO: Use username and password
  // TODO: Get this from the database
  const id = uuid4();
  const { ip } = req;
  const { port } = req.body;
  // TODO: Get from cache -> redis -> database
  let player: any | undefined = players.get<Player>(id);
  if (player) {
    player.updateNetworkData(ip, port);
  } else {
    player = new Player({
      id,
      ip,
      port,
      position: { x: 3, y: 0.5, z: -3 },
      health: 10,
      maxHealth: 10,
      speed: 3,
    });
    if (game.MAP_NAME) {
      const map = maps.get<Map>(game.MAP_NAME);
      player.setMap(map);
    }
  }
  players.set(id, player);
  const snapshot = await generateSnapshot();
  return res.status(200).json({ id, snapshot });
};
