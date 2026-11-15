const MongooseRepository = require('./mongooseRepository.js');

module.exports = Object.freeze({
  amazonBooks: new MongooseRepository(require('../models/amazon.model.js')),
  blacklists: new MongooseRepository(require('../models/blackList.model.js')),
  bookingHotels: new MongooseRepository(require('../models/booking.model.js')),
  feedSourceStatuses: new MongooseRepository(require('../models/feedSourceStatus.model.js')),
  indeedJobs: new MongooseRepository(require('../models/indeed.model.js')),
  posts: new MongooseRepository(require('../models/post.model.js')),
  savedSearchPresets: new MongooseRepository(require('../models/savedSearchPreset.model.js')),
  scrapeSchedules: new MongooseRepository(require('../models/scrapeSchedule.model.js')),
  users: new MongooseRepository(require('../models/user.model.js'))
});
