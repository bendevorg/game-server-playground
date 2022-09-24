import {
  Model,
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin,
} from 'sequelize';
import sequelize, { Character } from '~/models';
import { character } from '~/constants';
import schema from './schema';

class User extends Model {
  static async get(username: string): Promise<User | null> {
    return new Promise<User | null>(async (resolve, reject) => {
      return resolve(await User.findOne({ where: { username } }));
    });
  }

  static async getOrCreate(username: string): Promise<[User, boolean] | null> {
    return await User.findOrCreate({
      where: { username },
      defaults: {
        admin: false,
      },
    });
  }

  async newCharacter(name: string) {
    return await this.createCharacter({
      name,
      position: character.STARTING_POSITION,
      health: character.STARTING_HEALTH,
      maxHealth: character.STARTING_HEALTH,
      speed: character.STARTING_SPEED,
      attackRange: character.STARTING_ATTACK_RANGE,
      attackSpeed: character.STARTING_ATTACK_SPEED,
      mapId: character.STARTING_MAP,
    });
  }

  declare id: string;
  declare getCharacters: HasManyGetAssociationsMixin<Character>;
  declare createCharacter: HasManyCreateAssociationMixin<Character>;
}

User.init(schema, { sequelize });
export default User;
