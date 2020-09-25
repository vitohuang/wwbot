require('dotenv').config();
const path = require('path');

const BASE_PATH = path.join(__dirname, 'src', 'db');
const environment = process.env.NODE_ENV || 'development';

const common = {
  migrations: {
    directory: path.join(BASE_PATH, 'migrations'),
  },
  seeds: {
    directory: path.join(BASE_PATH, 'seeds'),
  },
  useNullAsDefault: true,
};

const configs = {
  production: {
    client: 'pg',
    connection: {
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      port: process.env.PGPORT,
			ssl: {
        rejectUnauthorized: false
      },
    },
    ...common,
    // searchPath: ['knex', 'public'],
  },
  development: {
    client: 'sqlite3',
    connection: {
      filename: './mydb.sqlite',
    },
    ...common,
  },
};

// Export the config
module.exports = configs[environment];
