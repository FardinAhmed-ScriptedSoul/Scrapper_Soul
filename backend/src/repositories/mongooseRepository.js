class MongooseRepository {
  constructor(model) {
    if (!model) {
      throw new TypeError('A Mongoose model is required.');
    }

    this.model = model;
  }

  find(filter = {}, options = {}) {
    let query = this.model.find(filter);
    if (options.select) query = query.select(options.select);
    if (options.sort) query = query.sort(options.sort);
    if (options.limit !== undefined) query = query.limit(options.limit);
    if (options.skip !== undefined) query = query.skip(options.skip);
    return query;
  }

  findOne(filter = {}, options = {}) {
    let query = this.model.findOne(filter);
    if (options.select) query = query.select(options.select);
    return query;
  }

  findById(id, options = {}) {
    let query = this.model.findById(id);
    if (options.select) query = query.select(options.select);
    return query;
  }

  create(document) {
    return this.model.create(document);
  }

  insertMany(documents, options) {
    return this.model.insertMany(documents, options);
  }

  exists(filter) {
    return this.model.exists(filter);
  }

  countDocuments(filter = {}) {
    return this.model.countDocuments(filter);
  }

  aggregate(pipeline = []) {
    return this.model.aggregate(pipeline);
  }

  findOneAndUpdate(filter, update, options = {}) {
    return this.model.findOneAndUpdate(filter, update, options);
  }

  findByIdAndUpdate(id, update, options = {}) {
    return this.model.findByIdAndUpdate(id, update, options);
  }

  findOneAndDelete(filter) {
    return this.model.findOneAndDelete(filter);
  }
}

module.exports = MongooseRepository;
