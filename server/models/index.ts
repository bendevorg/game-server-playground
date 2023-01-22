import { Sequelize } from 'sequelize';
import logger from 'log-champ';
import { database } from '~/constants';

const sequelize = new Sequelize(
  database.NAME,
  database.USERNAME,
  database.PASSWORD,
  {
    host: database.HOST,
    dialect: 'postgres',
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    logging: false,
  },
);

sequelize
  .authenticate()
  .then(() => console.info('🦞 Database connected.'))
  .catch((err) => logger.error(err));

export default sequelize;
export { default as Map } from './map';
export { default as LivingEntity } from './livingEntity';
export { default as Player } from './livingEntity/player';
export { default as Enemy } from './livingEntity/enemy';
export { default as Skill } from './Skill';
export { default as Projectile } from './projectile';

// Associations
import User from './User';
import Character from './Character';

// In order to create associations the model needs to be initiated
// before the association is made. To avoid circular dependencies
// We need to make this from here.
// There are clevers way to do this but the code becomes less readable
// So we are doing it right for now.
Character.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Character, { foreignKey: 'userId' });

// Syncs
User.sync({ alter: true });
Character.sync({ alter: true });

export { default as User } from './User';
export { default as Character } from './Character';
