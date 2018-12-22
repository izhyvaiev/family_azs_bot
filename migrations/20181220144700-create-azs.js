'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('azs',  {
	    id: {type: Sequelize.INTEGER, primaryKey: true, allowNull: false, autoIncrement: true},
	    code: Sequelize.STRING(128),
	    name: Sequelize.STRING(128),
	    qrCodeImage: {type: Sequelize.STRING(256), field: 'qr_code_image'},
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('azs');
  }
};