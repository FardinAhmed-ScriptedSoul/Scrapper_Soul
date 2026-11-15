// tests/unit/models/amazon.model.test.js
require('../../setup/mockRedis.js');
const AmazonBook = require('../../../../src/models/amazon.model.js');

describe('AmazonBook Model', () => {
  afterEach(async () => { await AmazonBook.deleteMany({}); });

  it('creates a valid book document', async () => {
    const book = await AmazonBook.create({
      searchTerm: 'machine learning',
      title: 'Hands-On ML',
      productUrl: 'https://amazon.com/product/123'
    });
    expect(book._id).toBeDefined();
    expect(book.searchTerm).toBe('machine learning');
    expect(book.reviewsCount).toBe(0);
  });

  it('lowercases searchTerm', async () => {
    const book = await AmazonBook.create({
      searchTerm: 'Python Programming',
      title: 'Python Book',
      productUrl: 'https://amazon.com/p/1'
    });
    expect(book.searchTerm).toBe('python programming');
  });

  it('rejects missing title', async () => {
    await expect(AmazonBook.create({
      searchTerm: 'test',
      productUrl: 'https://amazon.com/p/1'
    })).rejects.toThrow();
  });

  it('rejects missing productUrl', async () => {
    await expect(AmazonBook.create({
      searchTerm: 'test',
      title: 'Some Book'
    })).rejects.toThrow();
  });

  it('stores authors array', async () => {
    const book = await AmazonBook.create({
      searchTerm: 'deep learning',
      title: 'Deep Learning',
      authors: ['Ian Goodfellow', 'Yoshua Bengio'],
      productUrl: 'https://amazon.com/p/2'
    });
    expect(book.authors).toHaveLength(2);
  });

  it('stores price and rating as numbers', async () => {
    const book = await AmazonBook.create({
      searchTerm: 'ai',
      title: 'AI Book',
      price: 29.99,
      rating: 4.5,
      productUrl: 'https://amazon.com/p/3'
    });
    expect(typeof book.price).toBe('number');
    expect(book.rating).toBe(4.5);
  });
});