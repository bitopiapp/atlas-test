const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DB_DIALECT === 'mysql') {
  // Production: MySQL (cPanel)
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
    }
  );
} else {
  // Local development: SQLite (no installation needed)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
  });
}

module.exports = sequelize;
