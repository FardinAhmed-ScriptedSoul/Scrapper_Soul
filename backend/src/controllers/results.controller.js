const {
  amazonBooks,
  bookingHotels,
  indeedJobs,
  posts
} = require('../repositories');

const SOURCES = {
  amazon: {
    repository: amazonBooks,
    searchableFields: ['title', 'searchTerm', 'authors'],
    dateField: 'createdAt',
    projection: {
      title: '$title',
      summary: '$searchTerm',
      url: '$productUrl',
      date: '$createdAt',
      fields: {
        searchTerm: '$searchTerm',
        authors: '$authors',
        price: '$price',
        rating: '$rating',
        reviewsCount: '$reviewsCount'
      }
    }
  },
  indeed: {
    repository: indeedJobs,
    searchableFields: ['title', 'company', 'location', 'jobTitleQuery', 'locationQuery'],
    dateField: 'createdAt',
    projection: {
      title: '$title',
      summary: {
        $concat: [
          { $ifNull: ['$company', ''] },
          ' | ',
          { $ifNull: ['$location', ''] }
        ]
      },
      url: '$jobUrl',
      date: '$createdAt',
      fields: {
        jobTitleQuery: '$jobTitleQuery',
        locationQuery: '$locationQuery',
        company: '$company',
        location: '$location',
        salaryInfo: '$salaryInfo',
        benefits: '$benefits'
      }
    }
  },
  booking: {
    repository: bookingHotels,
    searchableFields: ['hotelName', 'destinationQuery'],
    dateField: 'createdAt',
    projection: {
      title: '$hotelName',
      summary: '$destinationQuery',
      url: '$hotelUrl',
      date: '$createdAt',
      fields: {
        destinationQuery: '$destinationQuery',
        checkInDate: '$checkInDate',
        checkOutDate: '$checkOutDate',
        pricePerNight: '$pricePerNight',
        rating: '$rating',
        reviewsCount: '$reviewsCount'
      }
    }
  },
  news: {
    repository: posts,
    searchableFields: ['title', 'contentSummary', 'sourceName', 'category'],
    dateField: 'publishedAt',
    projection: {
      title: '$title',
      summary: '$contentSummary',
      url: '$sourceUrl',
      date: { $ifNull: ['$publishedAt', '$createdAt'] },
      fields: {
        category: '$category',
        sourceName: '$sourceName'
      }
    }
  }
};

const MAX_LIMIT = 100;
const MAX_OFFSET = 10000;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInteger = (value, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const parseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : null;
};

const createMatch = (source, { userId, search, from, to }) => {
  const sourceConfig = SOURCES[source];
  const match = {};

  if (source !== 'news') match.userId = userId;
  if (search) {
    const regex = escapeRegex(search);
    match.$or = sourceConfig.searchableFields.map((field) => ({
      [field]: { $regex: regex, $options: 'i' }
    }));
  }

  if (from || to) {
    match[sourceConfig.dateField] = {};
    if (from) match[sourceConfig.dateField].$gte = from;
    if (to) {
      const exclusiveEnd = new Date(to);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      match[sourceConfig.dateField].$lt = exclusiveEnd;
    }
  }

  return match;
};

exports.listResults = async (req, res) => {
  const { source = 'all', q = '', from: fromValue, to: toValue, sort = 'newest' } = req.query;
  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, 20);
  const search = typeof q === 'string' ? q.trim() : null;
  const from = fromValue === undefined ? undefined : parseDate(fromValue);
  const to = toValue === undefined ? undefined : parseDate(toValue);

  if (page === null || limit === null || limit > MAX_LIMIT || (page - 1) * limit > MAX_OFFSET) {
    return res.status(400).json({ success: false, message: 'Invalid pagination parameters.' });
  }
  if (typeof source !== 'string' || (source !== 'all' && !SOURCES[source])) {
    return res.status(400).json({ success: false, message: 'Invalid result source.' });
  }
  if (search === null || search.length > 100) {
    return res.status(400).json({ success: false, message: 'Search text must be 100 characters or fewer.' });
  }
  if ((fromValue !== undefined && !from) || (toValue !== undefined && !to)) {
    return res.status(400).json({ success: false, message: 'Dates must use the YYYY-MM-DD format.' });
  }
  if (from && to && from > to) {
    return res.status(400).json({ success: false, message: 'The start date must not be after the end date.' });
  }
  if (!['newest', 'oldest'].includes(sort)) {
    return res.status(400).json({ success: false, message: 'Sort must be newest or oldest.' });
  }

  const selectedSources = source === 'all' ? Object.keys(SOURCES) : [source];
  const offset = (page - 1) * limit;
  const direction = sort === 'newest' ? -1 : 1;

  try {
    const sourceResults = await Promise.all(selectedSources.map(async (sourceName) => {
      const sourceConfig = SOURCES[sourceName];
      const match = createMatch(sourceName, {
        userId: req.user._id,
        search,
        from,
        to
      });
      const [records, total] = await Promise.all([
        sourceConfig.repository.aggregate([
          { $match: match },
          {
            $project: {
              _id: 1,
              source: { $literal: sourceName },
              ...sourceConfig.projection
            }
          },
          { $sort: { date: direction, _id: direction } },
          { $limit: offset + limit }
        ]),
        sourceConfig.repository.countDocuments(match)
      ]);
      return { records, total };
    }));

    const results = sourceResults.flatMap(({ records }) => records);
    results.sort((left, right) => {
      const dateDifference = new Date(left.date).getTime() - new Date(right.date).getTime();
      return direction * dateDifference ||
        left.source.localeCompare(right.source) ||
        String(left._id).localeCompare(String(right._id));
    });

    const total = sourceResults.reduce((count, result) => count + result.total, 0);
    const data = results.slice(offset, offset + limit).map((result) => ({
      ...result,
      _id: String(result._id)
    }));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to load saved results:', error);
    return res.status(500).json({ success: false, message: 'Failed to load saved results.' });
  }
};
