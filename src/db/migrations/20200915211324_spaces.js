
exports.up = function(knex) {
  return knex.schema.createTable('spaces', (table) => {
    table.increments('id').primary();
    table.string('name');
    table.string('display_name');
    table.string('type');
    table.string('incoming_webhook');
    table.string('location');
    table.string('lat_lon');
    table.string('tz');
    table.string('report_interval');
    table.timestamps(false, true);
  });
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTable('spaces'),
  ]);
};
