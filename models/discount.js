'use strict';
module.exports = (sequelize, DataTypes) => {
  const Discount = sequelize.define('discount', {
	  id: {type: DataTypes.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true},
	  azsId: {type: DataTypes.INTEGER, field: 'azs_id'},
	  amount: DataTypes.DECIMAL(10, 2),
	  startDate: {type: DataTypes.DATEONLY, field: 'start_date'},
	  endDate: {type: DataTypes.DATEONLY, field: 'end_date'},
	  description: {type: DataTypes.TEXT},
	  exclusive: {type: DataTypes.BOOLEAN},
	  user: {type: DataTypes.ENUM, values: ['All', 'Dasha', 'Ivan']},
  }, {timestamps: false});
  Discount.associate = function(models) {
    Discount.belongsTo(models.azs, {as: 'azs', foreignKey: 'azs_id'});
  };
  return Discount;
};