/**
 * @api {GET} /entity/:id/path GET Path
 * @apiName Retrieve path
 * @apiGroup Entity
 * @apiVersion 0.0.1
 *
 * @apiParam {String} id Entity's id
 * @apiSuccess (200) {String} data Path data.
 * @apiSuccessExample {json} Success-Response:
    {"waypoints": []}
 * @apiError (404) {String} msg Error message.
 * @apiErrorExample {json} Error-Response:
    { "data": "Entity not found." }
  *
 */

import { Request, Response } from 'express';
import { players } from '../../../cache';
import { Player } from '../../../interfaces';

export default async (req: Request, res: Response) => {
  // TODO: Check if have access to get this entities path
  const { id } = req.params;
  const player: Player | undefined = players.get<Player>(id);
  if (!player?.path || player.path.waypoints.length === 0) {
    return res.status(404).json();
  }
  const { position } = player;
  const { startNodePosition, target, waypoints } = player.path;
  const timestamp = new Date().getTime();
  return res
    .status(200)
    .json({ position, startNodePosition, target, waypoints, timestamp });
};
