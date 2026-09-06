const express = require('express');
const authRouter = require('./auth.routes');
const usersRouter = require('./users.routes');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);

module.exports = router;
