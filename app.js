require('dotenv').config();
const path = require('path');
const Koa = require('koa');
const serve = require('koa-static');
const bodyParser = require('koa-bodyparser');
const render = require('koa-ejs');
const router = require('./src/routes');
const worker = require('./src/worker');

// Make an new app
const app = new Koa();

render(app, {
  root: path.join(__dirname, 'src/views'),
  layout: false,
  viewExt: 'html',
  cache: false,
  debug: true
});

// Set keys for sign cookies etc
app.keys = process.env.APP_KEYS.split(',');
app.use(serve('./public/'));
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

// Handle error
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

// Start listen
const port = process.env.PORT || 8080;
(async() => {
	await app.listen(port);
	console.log('listerning on port', port);
})();
