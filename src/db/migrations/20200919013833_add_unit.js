
exports.up = function(knex) {
  return knex.schema.table('spaces', (table) => {
    table.string('unit').defaultTo('metric');
  });
};

exports.down = function(knex) {
  return knex.schema.table('spaces', (table) => {
    table.dropColumn('unit');
  });
};
