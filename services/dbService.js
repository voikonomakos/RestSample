'use strict';
const { MongoClient, ObjectID } = require('mongodb');
const debug = require('debug')('app');
const Utils = require('../common/utils');
const _ = require('lodash');

class DbService {

  static async find(collectionName, filter, projectionFields, sort, limit, skip) {
    let result;
    const projection = projectionFields ? { projection: projectionFields } : null;

    if (sort && limit && skip) {
      result = await DbService.execute(coll => coll.find(filter || {}, projection).sort(sort).skip(skip).limit(limit).toArray(), collectionName);
    } else if (sort && limit) {
      result = await DbService.execute(coll => coll.find(filter || {}, projection).sort(sort).limit(limit).toArray(), collectionName);
    } else if (sort) {
      result = await DbService.execute(coll => coll.find(filter || {}, projection).sort(sort).toArray(), collectionName);
    } else if (limit) {
      result = await DbService.execute(coll => coll.find(filter || {}, projection).limit(limit).toArray(), collectionName);
    } else {
      result = await DbService.execute(coll => coll.find(filter || {}, projection).toArray(), collectionName);
    }

    return result;
  }

  static async sample(collectionName, sampleSize) {
    const result = await DbService.execute(coll => coll.aggregate([{ $sample: { size: sampleSize } }]), collectionName);

    return result;
  }

  static async count(collectionName, filter) {
    const count = await DbService.execute(coll => coll.countDocuments(filter), collectionName);
    return count;
  }

  static async getRandom(collectionName, size) {
    const result = await DbService.execute(coll => coll.aggregate([{ $sample: { size: size } }]).toArray(), collectionName);
    return result;
  }

  static async findOne(collectionName, filter, projectionFields) {
    const projection = projectionFields ? { projection: projectionFields } : null;
    const result = await DbService.execute(coll => coll.findOne(filter, projection), collectionName);

    return result;
  }

  static async findById(collectionName, id, projectionFields) {

    const projection = projectionFields ? { projection: projectionFields } : null;
    const result = await DbService.execute(coll => coll.findOne({ _id: new ObjectID(id) }, projection), collectionName);

    return result;
  }

  static async findOneAndUpdate(collectionName, filter, update) {
    let result;
    result = await DbService.execute(coll => coll.findOneAndUpdate(filter, update, { upsert: true }), collectionName);
    return {
      modifiedCount: result.ok
    };
  }

  static async aggregate(collectionName, params) {
    const result = await DbService.execute(coll => coll.aggregate(params).toArray(), collectionName);
    return result;
  }

  static async insertOne(collectionName, model) {
    const result = await DbService.execute(coll => coll.insertOne(model), collectionName);

    return result;
  }

  static async update(collectionName, filter, update) {
    let result;
    result = await DbService.execute(coll => coll.update(filter, update, { upsert: true }), collectionName);
    return {
      modifiedCount: result.ok
    };
  }

  static async updateOne(collectionName, filter, update, options) {
    let result;

    if (options) {
      result = await DbService.execute(coll => coll.updateOne(filter, update, options), collectionName);
    } else {
      result = await DbService.execute(coll => coll.updateOne(filter, update), collectionName);
    }

    return {
      modifiedCount: result.result.nModified
    };
  }

  static async updateMany(collectionName, filter, update, options) {
    let result;

    if (options) {
      result = await DbService.execute(coll => coll.updateMany(filter, update, options), collectionName);
    } else {
      result = await DbService.execute(coll => coll.updateMany(filter, update), collectionName);
    }

    return {
      modifiedCount: result.result.nModified
    };
  }

  static async insertOne(collectionName, model) {

    const mapFn = result => {
      return { id: result.insertedId };
    }

    const result = await DbService.execute(coll => coll.insertOne(model), collectionName);

    return _.map(result, mapFn);
  }

  static async deleteById(collectionName, id) {

    const result = await DbService.execute(coll => coll.deleteOne({ _id: new ObjectID(id) }), collectionName);

    return result.deletedCount === 1;
  }

  static async deleteByIds(collectionName, ids) {

    const result = await DbService.execute(coll => coll.deleteMnay({ _id: { $in: _.map(ids, id => new ObjectID(id)) } }), collectionName);

    return result.deletedCount > 0;
  }

  static async delete(collectionName, query) {
    const result = await DbService.execute(coll => coll.deleteMany(query), collectionName);
    Utils.log(result);
  }

  static async execute(operation, collectionName) {
    let client, result;
    try {
      client = await MongoClient.connect(Utils.MongoDbConnectionString, { useNewUrlParser: true });
      const db = client.db(Utils.MongoDbName);

      if (collectionName) {
        const coll = await db.collection(collectionName);
        result = await operation(coll);
      } else {
        result = await operation(db);
      }

    } catch (error) {
      debug(error);
      if (client) {
        client.close();
      }

      throw error;
    }
    client.close();

    return result;
  }
}

module.exports = DbService;