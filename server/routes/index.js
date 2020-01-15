const express = require('express')
const apiRoutes = require('./api.routes')
const dataRoutes = require('./data.routes')
const serverRoutes = require('./server.routes')
const collectionRoutes = require('./collection.routes')

const router = express.Router()

router.use('/api', apiRoutes)
router.use('/data', dataRoutes)
router.use('/server', serverRoutes)
router.use('/collection', collectionRoutes)

module.exports = router
