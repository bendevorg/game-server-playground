import { DataTypes } from 'sequelize';
import { character } from '~/constants';

export default {
  // TODO: This should be an UUIDV4 like the user
  // The reason we are not doing that now is because we want the UDP messages to be as light as possible
  // So we are only using IDs for players. Eventually what we wanna do is to generate an integer for a player
  // But still tie that up to a uuidv4 character in the backend.
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    notEmpty: true,
  },
  position: {
    type: DataTypes.JSON,
    allowNull: false,
    notEmpty: true,
    default: character.STARTING_POSITION,
  },
  health: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: character.STARTING_HEALTH,
  },
  maxHealth: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: character.STARTING_HEALTH,
  },
  speed: {
    type: DataTypes.FLOAT,
    allowNull: false,
    default: character.STARTING_SPEED,
  },
  attackRange: {
    type: DataTypes.FLOAT,
    allowNull: false,
    default: character.STARTING_ATTACK_RANGE,
  },
  attackSpeed: {
    type: DataTypes.FLOAT,
    allowNull: false,
    default: character.STARTING_ATTACK_SPEED,
  },
  mapId: {
    type: DataTypes.STRING,
    allowNull: false,
    default: character.STARTING_MAP,
  },
};
