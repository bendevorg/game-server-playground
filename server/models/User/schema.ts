import { DataTypes } from 'sequelize';

export default {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    notEmpty: true,
  },
};
