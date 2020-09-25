const debug = require('debug')('WW:Routes');
const axios = require('axios');

async function sendMessage(webhookUrl, payload) {
  debug('send message to data', payload);

  try {
    const result = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-type': 'application/json; charset=UTF-8',
      },
    });

    debug('send message and here is the result', result);
    if (result && result.data) {
      return result.data;
    }

    return result;
  } catch (error) {
    console.error('Error getting sending text', error);
    return false;
  }
}

async function geocode(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.MAP_API}`

  try {
    const result = await axios.get(url);

   debug('result from geocoding', result);
    if (result && result.data) {
      return result.data;
    }

    return result;
  } catch (error) {
    console.error('Error getting geocode', error);
    return false;
  }
}

async function timezone(address) {
  const ts = Date.now() / 1000;
  const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${address}&timestamp=${ts}&key=${process.env.MAP_API}`

  try {
    const result = await axios.get(url);

    debug('result from timeone', result);
    if (result && result.data) {
      return result.data;
    }

    return result;
  } catch (error) {
    console.error('Error getting geocode', error);
    return false;
  }
}

async function getWeather(lat, lon, unit = 'metric') {
  const fields = [
    'weather_code',
    //'precipitation',
    //'precipitation_type',
    'temp',
    //'humidity',
    //'feels_like',
    'wind_speed',
    'wind_direction',
    //'wind_gust',
    //'fire_index',
    //'pm25',
    'cloud_cover',
    'visibility',
    'sunrise',
    'sunset',
    //'baro_pressure',
  ].join(',');

  let unitSystem = 'si';
  if (unit === 'imperial') {
    unitSystem = 'us';
  }

  const url = `https://api.climacell.co/v3/weather/realtime?lat=${lat}&lon=${lon}&unit_system=${unitSystem}&fields=${fields}&apikey=${process.env.CLIMACELL_API}`;

  try {
    const result = await axios.get(url);

    debug('result from weather api', result);
    if (result && result.data) {
      return result.data;
    }

    return result;
  } catch (error) {
    console.error('Error getting geocode', error);
    return false;
  }
}

function latLonToTile(lat, lon, zoom) {
  return {
    x: (Math.floor((lon+180)/360*Math.pow(2,zoom))),
    y: (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))),
  };
}
async function getRadarImage(lat, lon) {
  const url = `https://api.rainviewer.com/public/maps.json`;

  try {
    const result = await axios.get(url);

    debug('result from get map tile', result);
    if (result && result.data) {
      const zoom = 5;
      const tile = latLonToTile(lat, lon, zoom);
      const latestTs = result.data.pop();

      return `https://tilecache.rainviewer.com/v2/radar/${latestTs}/512/5/${tile.x}/${tile.y}/1/0_0.png`;
    }

    return '';
  } catch (error) {
    console.error('Error getting geocode', error);
    return false;
  }
}

module.exports = {
  sendMessage,
  geocode,
  getWeather,
  timezone,
}
