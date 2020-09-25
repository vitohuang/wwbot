const debug = require('debug')('WW:worker');
const agenda = require('./agenda');
const WeatherJob = require('./jobs/weather');
const Spaces = require('./db/queries/spaces');

async function addSpaceJob(space) {
  const jobName = `${space.name}`;

  debug('going to define a new job and start it', jobName);
  // Define the job
  agenda.define(jobName, WeatherJob.sendWeatherNotification);

  // Start the job
  agenda.every(space.report_interval, jobName, {
    spaceName: space.name,
  }, {
    timezone: space.tz,
  });
}

async function removeSpaceJob(space) {
  const jobName = `${space.name}`;
  debug('going to remove job', jobName);

  const jobs = await agenda.jobs({
    name: jobName,
  });
  debug('jobs', jobs);

  const numRemoved = await agenda.cancel({
    name: jobName,
  });

  debug('Job removed', numRemoved);
}

agenda.start()
  .then(async () => {
    debug('Job processor started!')
    const spaces = await Spaces.getAll();
    debug('spaces', spaces);
    spaces.forEach(space => {
      const jobName = `${space.name}`;
      debug('going to add job', jobName);
      agenda.define(jobName, WeatherJob.sendWeatherNotification);
    });
  })
  .catch(error => {
    console.error('Something wrong while starting job processor', error);
  });

module.exports = {
  agenda,
  addSpaceJob,
  removeSpaceJob,
}
