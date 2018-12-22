'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => queryInterface.addColumn(
	  'discounts',
	  'exclusive',
	  {type: Sequelize.BOOLEAN, defaultValue: false}
  ),

  down: (queryInterface) => queryInterface.removeColumn(
	  'discounts',
	  'exclusive'
  ),
};
