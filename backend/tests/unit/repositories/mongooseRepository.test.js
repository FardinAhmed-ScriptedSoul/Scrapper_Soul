const MongooseRepository = require('../../../src/repositories/mongooseRepository.js');

describe('MongooseRepository', () => {
  it('applies query options and returns the model query', () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis()
    };
    const model = { find: jest.fn().mockReturnValue(query) };
    const repository = new MongooseRepository(model);

    expect(repository.find({ active: true }, {
      select: 'name',
      sort: { createdAt: -1 },
      limit: 10,
      skip: 5
    })).toBe(query);
    expect(model.find).toHaveBeenCalledWith({ active: true });
    expect(query.select).toHaveBeenCalledWith('name');
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(query.skip).toHaveBeenCalledWith(5);
  });

  it('propagates persistence errors to the caller', async () => {
    const error = new Error('database unavailable');
    const repository = new MongooseRepository({
      create: jest.fn().mockRejectedValue(error)
    });

    await expect(repository.create({ name: 'sample' })).rejects.toBe(error);
  });
});
