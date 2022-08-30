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
import { Player, Enemy } from '~/models';

export default async (req: Request, res: Response) => {
  // TODO: Check if have access to get this entity's path
  const { id } = req.params;
  let entity: Player | Enemy | null = Player.get(id);
  if (!entity) {
    entity = Enemy.get(id);
  }
  if (!entity?.path || entity.path.waypoints.length === 0) {
    return res.status(404).json();
  }
  const { position } = entity;
  const { startNodePosition, target, waypoints } = entity.path;
  const timestamp = new Date().getTime();
  return res
    .status(200)
    .json({ position, startNodePosition, target, waypoints, timestamp });
};
