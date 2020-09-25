const debug = require('debug')('WW:Routes');
const fs = require('fs');
const path = require('path');
const Router = require('@koa/router');
const Spaces = require('../db/queries/spaces');
const Api = require('../api');
const Worker = require('../worker');
const WeatherJob = require('../jobs/weather');
const cron = require('cron-validator');
const auth = require('basic-auth');

const router = new Router();

function check(username, password) {
  return username === process.env.HTTP_BASIC_USERNAME && password === process.env.HTTP_BASIC_PASSWORD;
}

async function basicAuth(ctx, next) {
  const credentials = auth(ctx.request);
  
  // Check the credentials
  if (!credentials || !check(credentials.name, credentials.pass)) {
    ctx.status = 401;
    ctx.set('WWW-Authenticate', 'Basic');
    ctx.body = '';
  } else {
    await next();
  }
}

async function addressToLocation(address) {
  const data = await Api.geocode(address);

  if (data.results.length === 0) {
    return '';
  }

  // Get the result
  const result = data.results[0];
  return {
    formattedAddress: result.formatted_address,
    location: result.geometry.location,
  };
}

async function addressToTz(address) {
  const data = await Api.timezone(address);

  if (data && data.timeZoneId) {
    return data.timeZoneId;
  } else {
    return '';
  }
}

async function getHelpMessage() {
  const widgets = [
    {
      textParagraph: {
        text: '<b>Location</b> - Set the location of the weather report e.g @wwbot location new york',
      }
    },
    {
      textParagraph: {
        text: '<b>Unit</b> - Set the unit of the weather report e.g @wwbot unit imperial',
      }
    },
    {
      textParagraph: {
        text: '<b>Report interval</b> - Set report interval e.g @wwbot report_interval',
      }
    },
  ];

  Object.keys(WeatherJob.iconMapping).forEach((name) => {
    widgets.push({
      keyValue: {
        content: name,
        iconUrl: WeatherJob.iconMapping[name],
      },
    });
  });

  const sections = [
    {
      widgets,
    }
  ];

  return {
    cards: [
      {
        header: {
          title: `Help`,
        },
        sections,
      },
    ]
  };
}

async function handleBotAdded(data) {
  const currentSpace = {
    name: data.space.name,
    display_name: data.space.displayName,
    type: data.space.type,
    report_interval: '0 9 * * *',
  };

  // Add to space
  await Spaces.add(currentSpace)
  debug('created space');

  // await Worker.addSpaceJob(currentSpace);

  // Print out help
  return getHelpMessage();
}

async function handleBotRemoved(data) {
  const spaceName = data.space.name;

  // Add to space
  await Spaces.deleteBySpaceName(spaceName);
  debug('deleted space');

  await Worker.removeSpaceJob({
    name: spaceName,
  });

  // Print out help
  return {
    text: 'Bye',
  };
}

async function handleMessage(data) {
  // Get current space
  const spaceName = data.space.name;
  const currentSpace = await Spaces.get(spaceName);

  // Figure out the command
  let command = '';
  let parts = [];
  if (data.message.argumentText) {
    const argumentText = data.message.argumentText.trim();
    parts = argumentText.split(' ');
    command = parts[0];
  }

  // Handle the command
  if (command === 'location') {
    const loc = parts.slice(1).join(' ');
    
    if (loc === '') {
      return {
        text: `Current location: ${currentSpace.location} Timezone: ${currentSpace.tz} coordinate: ${currentSpace.lat_lon}`,
      }
    }
    // Validate the location
    const locationData = await addressToLocation(loc);
    debug(locationData);

    const latlon = `${locationData.location.lat},${locationData.location.lng}`;

    // Get timezone info
    const tz = await addressToTz(latlon);

    debug(Spaces);
    // Save the location
    await Spaces.updateBySpaceName(spaceName, {
      location: locationData.formattedAddress,
      lat_lon: latlon,
      tz,
    });

    // 3. Stop the current job
    await Worker.removeSpaceJob({
      name: spaceName,
    });

    // 4. Start a new job
    await Worker.addSpaceJob({
      name: spaceName,
      report_interval: currentSpace.report_interval,
      tz: tz,
    });

    return {
      text: `Location saved - ${locationData.formattedAddress} Timezone: ${tz} Coordinate: ${latlon}`
    }
  } else if (command === 'unit') {
    const unit = parts.slice(1).join(' ');
    
    if (unit === '') {
      return {
        text: `Current unit system - ${currentSpace.unit}`,
      }
    }

    if (['metric', 'imperial'].indexOf(unit) === -1) {
      return {
        text: `Only accept *metric* or *imperial* as unit`,
      }
    }

    // Save the location
    await Spaces.updateBySpaceName(spaceName, {
      unit,
    });

    return {
      text: `Unit system saved - ${unit}`
    }
  } else if (command === 'report_interval') {
    const value = parts.slice(1).join(' ');

    if (!value) {
      return {
        text: `Current report interval - ${currentSpace.report_interval}`
      };
    }

    // 1. Validate the report interval
    if (!cron.isValidCron(value)) {
      return {
        text: `${value} is invalid corn expression, <https://crontab.guru|more details about cron expression>`,
      };
    }

    // Save the report interval
    await Spaces.updateBySpaceName(spaceName, {
      report_interval: value,
    });

    // 3. Stop the current job
    await Worker.removeSpaceJob({
      name: spaceName,
    });

    // 4. Start a new job
    await Worker.addSpaceJob({
      name: spaceName,
      report_interval: value,
      tz: currentSpace.tz,
    });

    return {
      text: `Report interval set to ${value}`,
    };
  } else if (command === 'help') {
    return getHelpMessage();
  }

  if (!currentSpace.lat_lon) {
    return {
      text: 'Sorry no location set',
    }
  }

  const weatherInfo = await WeatherJob.getWeatherInfo(currentSpace);

  debug('weather info', weatherInfo);

  return weatherInfo;

  // Check if its the 
  return {
    text: data.message.text,
  };
}

router.get('/', async(ctx) => {
  ctx.body = 'hello world';
});

router.post('/', async(ctx) => {
  const data = ctx.request.body;
  const type = data.type;
  if (type === 'ADDED_TO_SPACE' && !data.space.singleUserBotDm) {
    ctx.body = await handleBotAdded(data);
    return;
  }

  if (type === 'REMOVED_FROM_SPACE') {
    ctx.body = await handleBotRemoved(data);
    return;
  }

  if (type === 'MESSAGE') {
    ctx.body = await handleMessage(data);
    return;
  }

  ctx.body = data;
});

async function sendNotifications() {
  const data = {
    name: "spaces/AAAACwZhYHI/threads/da4B427s-ug",
    text: `Hello!!! ${Date.now()}`,
  };

  const spaceName = 'spaces/AAAACwZhYHI';
  const theSpace = await Spaces.get(spaceName);
  debug('the space', theSpace);
  const webhookUrl = theSpace.incoming_webhook;
  if (!webhookUrl) {
    debug('The space does not have incoming webhook url');
    return;
  }

  const result = await Api.sendMessage(webhookUrl, data);

  return result;
}

router.get('/send', basicAuth, async(ctx) => {
  const spaceName = 'spaces/AAAACwZhYHI';

  const result = await WeatherJob.sendWeatherNotification({
    attrs: {
      data: {
        spaceName,
      },
    },
  });

  ctx.body = result;
});

router.get('/settings', basicAuth, async(ctx) => {
  const allSpaces = await Spaces.getAll();

  await ctx.render('settings', {
    spaces: allSpaces,
  });
});

router.post('/settings', basicAuth, async(ctx) => {
  const body = ctx.request.body;
  debug('body', body);
  const settings = body.settings;
  if (settings) {
    const spaceNames = Object.keys(settings);
    for (const spaceName of spaceNames) {
      const webhook = settings[spaceName].webhook;
      if (webhook) {
        debug('Going to update webhook', {
          spaceName,
          webhook,
        });

        await Spaces.updateBySpaceName(spaceName, {
          incoming_webhook: webhook,
        });
      }
    }
  }
  
  ctx.redirect('/settings');
});

router.get('/report', basicAuth, async(ctx) => {
  const spaceName = 'spaces/AAAACwZhYHI';

  const currentSpace = await Spaces.get(spaceName);

  const weatherInfo = await WeatherJob.getWeatherInfo(currentSpace);
  
  ctx.body = weatherInfo;
});

module.exports = router;
