const debug = require('debug')('WW:job');
const path = require('path');
const captureWebsite = require('capture-website');
const Api = require('../api');
const Spaces = require('../db/queries/spaces');
const { zonedTimeToUtc, utcToZonedTime, format } = require('date-fns-tz');

function getRadarMapUrl(lat, lon, zoom) {
  return `http://rain-radar-map.s3-website-eu-west-1.amazonaws.com/index.html?latlon=${lat},${lon}&zoom=${zoom}`;
}

async function generateRadarMap(lat, lon, zoom) {
  try {
    const url = getRadarMapUrl(lat, lon, zoom);
    const fileName = `${lat}-${lon}-${zoom}-${Date.now()}.png`;
    const outputPath = path.resolve(__dirname, `../../public/images/${fileName}`);

    // Going to do the capture
    await captureWebsite.file(url, outputPath, {
			launchOptions: {
					args: [
						'--no-sandbox',
						'--disable-setuid-sandbox'
					],
				},
    });

    // Return the path
    return `${process.env.SITE_URL}/images/${fileName}`;
  } catch (error) {
    console.error('There is an error', error);
  }
}

const iconMapping = {
	temp: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u1f321.png',
	wind_speed: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u1f390.png',
	visibility: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u1f440.png',
	cloud_cover: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u2601.png',
	sunrise: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u1f307.png',
	sunset: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u1f306.png',
  wind_direction: 'https://ssl.gstatic.com/dynamite/emoji/png/32/emoji_u2197.png',
}

function getFeildContent(name, value, url, tz) {
  debug({
    name,
    value, 
    url,
  })
  let text = `${value.value} ${value.units ? value.units : ''}`;
  if (['sunrise', 'sunset'].indexOf(name) !== -1) {
    debug('the time from vaue', {
      name,
      value,
      tz,
    });
    const d = new Date(value.value);
  const zonedDate = utcToZonedTime(d, tz);
    text = format(zonedDate, 'HH:mm', {
      timeZone: tz,
    });
  }

  return [
    {
      imageButton: {
        iconUrl: iconMapping[name],
        onClick: {
          openLink: {
            url,
          },
        },
      },
    },
    {
      textButton: {
        text,
        onClick: {
          openLink: {
            url,
          },
        },
      },
    },
  ];
}

function formatWeatherInfo(info, url, tz) {
  let buttons = [];

  debug('info', info, info['wind_speed']);
  buttons = buttons.concat(getFeildContent('temp', info['temp'], url));
  buttons = buttons.concat(getFeildContent('wind_speed', info['wind_speed'], url));
  buttons = buttons.concat(getFeildContent('visibility', info['visibility'], url));
  buttons = buttons.concat(getFeildContent('wind_direction', info['wind_direction'], url));
  buttons = buttons.concat(getFeildContent('cloud_cover', info['cloud_cover'], url));
  buttons = buttons.concat(getFeildContent('sunrise', info['sunrise'], url, tz));
  buttons = buttons.concat(getFeildContent('sunset', info['sunset'], url, tz));

  let weatherCode = info['weather_code'].value;
  if (['clear', 'mostly_clear', 'partly_cloudy'].indexOf(weatherCode) !== -1) {
    weatherCode += '_day';
  }

  // Add on the current weather
  buttons = buttons.concat([
    {
      textButton: {
        text: 'Current Weather',
        onClick: {
          openLink: {
            url,
          },
        },
      },
    },
    {
      imageButton: {
        iconUrl: `https://rain-radar-map.s3-eu-west-1.amazonaws.com/weather_codes/${weatherCode}.png`,
        onClick: {
          openLink: {
            url,
          },
        },
      },
    },
  ]);

  // Return a widget
  return [
    {
      buttons,
    }
  ]
}

async function getWeatherInfo(currentSpace) {
  let [lat, lon] = currentSpace.lat_lon.split(',');
  lat = parseFloat(lat);
  lon = parseFloat(lon);
  const zoom = 6;

  const info = await Api.getWeather(lat, lon, currentSpace.unit);
  const radarImage = await generateRadarMap(lat, lon, zoom);

  const sections = [
    {
      widgets: formatWeatherInfo(info, radarImage, currentSpace.tz),
    },
    {
      header: 'Radar image',
      widgets: [
        {
          image: {
            imageUrl: radarImage,
            aspectRatio: 1,
            onClick: {
              openLink: {
                url: radarImage,
              }
            },
          },
        },
      ],
    }
  ]

  const currentDate = new Date();
  const zonedDate = utcToZonedTime(currentDate, currentSpace.tz);
  const pattern = 'd.M.yyyy HH:mm:ss.SSS'
  const dt = format(zonedDate, pattern, { timeZone: currentSpace.tz });
  return {
    cards: [
      {
        header: {
          title: `Weather for ${currentSpace.location} at ${dt}`,
        },
        sections,
      },
    ]
  };
}

async function sendWeatherNotification(job) {
  try {
    const {
      spaceName,
    } = job.attrs.data;

    debug('Send weather notification for', {
      spaceName,
    });

    const currentSpace = await Spaces.get(spaceName);

    if (!currentSpace) {
      debug('Space does not exist', spaceName);
      return;
    }

    if (!currentSpace.incoming_webhook) {
      debug('Sorry no incoming webhook', spaceName);
      return;
    }

    // Get the weather info
    const weatherInfo = await getWeatherInfo(currentSpace);

    debug('Got the weather info', weatherInfo);
    // Send it

    return await Api.sendMessage(currentSpace.incoming_webhook, weatherInfo);
  } catch (error) {
    console.error('Error while processing send weather notification', error);
  }
}

module.exports = {
  iconMapping,
  getWeatherInfo,
  sendWeatherNotification,
};
