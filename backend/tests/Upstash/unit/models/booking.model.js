// tests/unit/models/booking.model.test.js
require('../../setup/mockRedis.js');
const BookingHotel = require('../../../../src/models/booking.model.js');

describe('BookingHotel Model', () => {
  afterEach(async () => { await BookingHotel.deleteMany({}); });

  it('creates a valid hotel document', async () => {
    const hotel = await BookingHotel.create({
      destinationQuery: 'paris',
      checkInDate: '2026-07-01',
      checkOutDate: '2026-07-05',
      hotelName: 'Hotel Paris',
      hotelUrl: 'https://booking.com/hotel/paris'
    });
    expect(hotel._id).toBeDefined();
    expect(hotel.destinationQuery).toBe('paris');
    expect(hotel.rating).toBeNull();
  });

  it('rejects missing hotelUrl', async () => {
    await expect(BookingHotel.create({
      destinationQuery: 'london',
      checkInDate: '2026-07-01',
      checkOutDate: '2026-07-03',
      hotelName: 'Hotel London'
    })).rejects.toThrow();
  });

  it('rejects missing checkInDate', async () => {
    await expect(BookingHotel.create({
      destinationQuery: 'rome',
      checkOutDate: '2026-07-03',
      hotelName: 'Hotel Rome',
      hotelUrl: 'https://booking.com/hotel/rome'
    })).rejects.toThrow();
  });

  it('has compound index on destination + checkIn + checkOut', async () => {
    await BookingHotel.init();
    const indexes = await BookingHotel.collection.listIndexes().toArray();
    const hasCompound = indexes.some(index =>
      index.key.destinationQuery === 1 &&
      index.key.checkInDate === 1 &&
      index.key.checkOutDate === 1
    );
    expect(hasCompound).toBe(true);
  });

  it('stores numeric rating', async () => {
    const hotel = await BookingHotel.create({
      destinationQuery: 'tokyo',
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-03',
      hotelName: 'Hotel Tokyo',
      hotelUrl: 'https://booking.com/hotel/tokyo',
      rating: 8.7
    });
    expect(hotel.rating).toBe(8.7);
  });
});