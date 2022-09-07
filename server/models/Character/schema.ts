import { DataTypes } from 'sequelize';

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
  },
  health: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0,
  },
  maxHealth: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0,
  },
  speed: {
    type: DataTypes.FLOAT,
    allowNull: false,
    default: 0,
  },
  attackRange: {
    type: DataTypes.FLOAT,
    allowNull: false,
    default: 0,
  },
  attackSpeed: {
    type: DataTypes.FLOAT,
    allowNull: false,
    default: 0,
  },
  visionRange: {
    type: DataTypes.INTEGER,
    allowNull: false,
    default: 0,
  },
  // TODO: This should not be like this
  mapId: {
    type: DataTypes.STRING,
    allowNull: false,
    default: 'test',
  },
};
