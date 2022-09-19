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

import { NextFunction, Request, Response } from 'express';
import { Attributes } from 'sequelize';
import generateSnapshot from '~/controllers/generateSnapshot';
import { Player, Map } from '~/models';
import { User, Character } from '~/models';
import { NotFound, UnexpectedError } from '~/errors';

export default async (req: Request, res: Response, next: NextFunction) => {
  // In the future this info will be returned by the select character or something like that
  const { ip } = req;
  const { port, username } = req.body;
  // TODO: Use password
  const user = await User.get(username);
  if (!user) return next(new NotFound());
  const characters: Attributes<Character>[] = await user.getCharacters({
    raw: true,
  });
  if (!characters || characters.length === 0) return next(new NotFound());
  const player = await Player.generate(characters[0]);
  if (!player) return next(new NotFound());
  player.updateNetworkData(ip, port);
  const map = Map.get(player.mapId);
  if (!map) {
    return next(new UnexpectedError('Map not found.'));
  }
  player.setMap(map);
  player.save();
  const mapSnapshot = await generateSnapshot(false);
  const snapshot = await player.generateSnapshotForPlayer(mapSnapshot);
  // TODO: Generate and send a connection token
  return res.status(200).json({ port, snapshot, map: player.mapId });
};
