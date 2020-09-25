const debug = require('debug')('DB:Spaces');
const knex = require('../connection');

function cleanUp(rawData) {
  return rawData;
}

async function add(data) {
  // Clean up the data first

  // Insert it
  const result = await knex('spaces').insert(data);

  debug('result after insert into database', result);
  return result;
}

async function get(spaceName) {
  const result = await knex('spaces')
    .select('*')
    .where({
      name: spaceName,
    })
    .first();

  debug('after getting space info', spaceName, result);

  return cleanUp(result);
}

async function getAll() {
  const results = await knex('spaces')
    .select('*');

  return results.map((space) => cleanUp(space));
}

async function updateBySpaceName(name, updates) {
  const result = await knex('spaces')
    .update(updates)
    .where({
      name,
    });

  return result;
}

async function deleteBySpaceName(spaceName) {
  const result = await knex('spaces')
    .del()
    .where({
      name: spaceName,
    });

  debug('deleted space from name', spaceName);
  return result;
}

module.exports = {
  add,
  get,
  getAll,
  updateBySpaceName,
  deleteBySpaceName,
};
