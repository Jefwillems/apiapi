const mongoose = require('mongoose')
const { get: getProp } = require('lodash')
const RedisService = require('../../services/redis.service')
const HttpService = require('../../services/http.service')
const Device = require('./device.model')

const PATH_TYPES = {
  PATH: 'path',
  CONSTANT: 'constant'
}

const defaultPathValue = {
  id: {
    type: PATH_TYPES.PATH,
    value: ''
  },
  organization: {
    type: PATH_TYPES.PATH,
    value: ''
  },
  reference: {
    type: PATH_TYPES.PATH,
    value: ''
  },
  application: {
    type: PATH_TYPES.PATH,
    value: ''
  },
  types: {
    type: PATH_TYPES.CONSTANT,
    value: [
      {
        name: '',
        application: '',
        description: ''
      }
    ]
  },
  categories: {
    type: PATH_TYPES.CONSTANT,
    value: ['']
  },
  longitude: {
    type: PATH_TYPES.PATH,
    value: ''
  },
  latitude: {
    type: PATH_TYPES.PATH,
    value: ''
  },
  meta: {
    type: PATH_TYPES.PATH,
    value: ''
  }
}

module.exports.PATH_TYPES = PATH_TYPES

const ApiSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: false
  },
  authMethod: {
    type: String,
    default: 'open'
  },
  url: {
    type: String,
    required: true
  },
  paths: {
    required: true,
    default: defaultPathValue,
    type: Object
  },
  dataPath: {
    type: String,
    default: ''
  },
  customHeaders: {},
  requestMethod: {
    type: String,
    default: 'get'
  },
  requestData: {
    type: String,
    default: ''
  }
})

ApiSchema.methods.raw = async function getRawData () {
  const client = new HttpService(this.url, this.customHeaders)
  const { data } = this.requestMethod === 'get'
    ? await client.get()
    : await client.post(this.requestData)
  return data
}

ApiSchema.methods.invoke = function invokeApi () {
  return RedisService.getData(this.name).then((cachedResponse) => {
    if (cachedResponse) {
      return JSON.parse(cachedResponse)
    }
    const client = new HttpService(this.url, this.customHeaders)
    const prom = this.requestMethod === 'get'
      ? client.get()
      : client.post(this.requestData)

    return prom.then(({ data: response }) => {
      const data = !this.dataPath ? response : getProp(response, this.dataPath)

      const searchProp = (element, prop) => {
        if (!this.paths[prop]) { return undefined }
        return this.paths[prop].type === PATH_TYPES.CONSTANT
          ? this.paths[prop].value
          : getProp(element, this.paths[prop].value)
      }
      const allData = data.map((element) => {
        const id = searchProp(element, 'id')
        const organization = searchProp(element, 'organization')
        const reference = searchProp(element, 'reference')
        const longitude = searchProp(element, 'longitude')
        const latitude = searchProp(element, 'latitude')
        const application = searchProp(element, 'application')
        const meta = searchProp(element, 'meta')
        const types = searchProp(element, 'types')
        const categories = searchProp(element, 'categories')
        return new Device({
          id,
          organization,
          reference,
          longitude,
          latitude,
          application,
          meta,
          types,
          categories
        })
      })
      RedisService.setData(this.name, JSON.stringify(allData))
      return allData
    })
  })
}

const ApiModel = mongoose.model('Api', ApiSchema)
ApiModel.getAll = () => ApiModel.find({})
ApiModel.addApi = api => api.save()

module.exports = ApiModel
