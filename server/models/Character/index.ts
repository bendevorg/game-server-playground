import { Model } from 'sequelize';
import sequelize from '~/models';
import schema from './schema';

class Character extends Model {}

Character.init(schema, { sequelize });
export default Character;
