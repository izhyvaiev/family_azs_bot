'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn(
	  'discounts',
	  'user',
	  {type: Sequelize.ENUM, defaultValue: 'All', values: ['All', 'Dasha', 'Ivan']}
  ),

  down: (queryInterface) => queryInterface.removeColumn(
	  'discounts',
	  'user'
  ),
};
