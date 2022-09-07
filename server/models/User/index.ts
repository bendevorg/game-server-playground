import { Model, HasManyGetAssociationsMixin } from 'sequelize';
import sequelize, { Character } from '~/models';
import schema from './schema';

class User extends Model {
  static async get(username: string): Promise<User | null> {
    return new Promise<User | null>(async (resolve, reject) => {
      return resolve(await User.findOne({ where: { username } }));
    });
  }
  declare getCharacters: HasManyGetAssociationsMixin<Character>;
}

User.init(schema, { sequelize });
export default User;
