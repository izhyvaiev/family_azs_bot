'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('discounts', {
	    id: {type: Sequelize.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true},
	    azsId: {type: Sequelize.INTEGER, field: 'azs_id', references: {
			    model: 'azs',
			    key: 'id'
		    }},
	    amount: Sequelize.DECIMAL(10, 2),
	    startDate: {type: Sequelize.DATEONLY, field: 'start_date'},
	    endDate: {type: Sequelize.DATEONLY, field: 'end_date'},
	    description: {type: Sequelize.TEXT}
    });
  },
  down: (queryInterface) => {
    return queryInterface.dropTable('discounts');
  }
};