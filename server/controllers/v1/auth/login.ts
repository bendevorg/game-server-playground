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
import generateSnapshot from '~/controllers/generateSnapshot';
import { Player, Map } from '~/models';
import { game } from '~/constants';
import { UnexpectedError } from '~/errors';

// TODO: This is a counter that will be removed once we have a database
// To get user's ids
let playerCounter = 0;

export default async (req: Request, res: Response) => {
  // In the future this info will be returned by the select character or something like that
  const { ip } = req;
  const { port } = req.body;
  // TODO: Use username and password
  // TODO: Get this from the database
  const id = playerCounter++;
  let player = Player.get(id);
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
      attackRange: 1,
      attackSpeed: 1,
      visionRange: game.VISION_DISTANCE,
    });
    if (game.MAP_NAME) {
      const map = Map.get(game.MAP_NAME);
      if (!map) {
        throw new UnexpectedError('Map not found.');
      }
      player.setMap(map);
    }
  }
  Player.set(id, player);
  const snapshot = await generateSnapshot();
  return res.status(200).json({ id, snapshot });
};
