const express = require('express');
const apiRouter = require('./routes/api.routes');
const rootRouter = require('./routes/root.routes');
const errorHandler = require('./middleware/error-handler');
const notFound = require('./middleware/not-found');

const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.use('/', rootRouter);
app.use('/api/v1', apiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
