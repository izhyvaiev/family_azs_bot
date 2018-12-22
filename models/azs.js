'use strict';
module.exports = (sequelize, DataTypes) => {
  const Azs = sequelize.define('azs', {
	  id: {type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true},
	  code: DataTypes.STRING(128),
	  name: DataTypes.STRING(128),
	  qrCodeImage: {type: DataTypes.STRING(256), field: 'qr_code_image'},
  }, {timestamps: false});
    Azs.associate = function(models) {
    Azs.hasMany(models.discount, {foreignKey: 'azs_id'});
  };
  return Azs;
};