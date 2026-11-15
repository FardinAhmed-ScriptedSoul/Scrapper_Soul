// tests/setup/mockRedis.js
// Call this at the top of any test file that touches Redis-dependent code.
// It replaces ioredis with an in-memory stub so Bull/OTP never need real Upstash.


// Add this at the TOP of tests/Upstash/setup/mockRedis.js, before the ioredis mock

jest.mock('../../../src/config/config.js', () => ({
  env: 'test',
  port: 3000,
  db: { uri: process.env.MONGODB_URI },
  redis: { uri: 'redis://localhost:6379' },
  jwt: {
    secret: 'test_jwt_secret_key_scrapper_soul',
    expiresIn: '7d'
  },
  python: {
    executable: process.env.PYTHON_EXECUTABLE || 'python'
  },
  mail: {
    user: 'test@test.com',
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    refreshToken: 'test_refresh_token'
  }
}));


jest.mock('ioredis', () => {
  const EventEmitter = require('events');



  class RedisMock extends EventEmitter {
    constructor() {
      super();
      this.store = {};
      this.status = 'ready';
      // Emit ready on next tick so Bull initialises correctly
      setImmediate(() => this.emit('ready'));
    }
    async get(key)              { return this.store[key] ?? null; }
    async set(key, value)       { this.store[key] = value; return 'OK'; }
    async del(key)              { delete this.store[key]; return 1; }
    async exists(key)           { return key in this.store ? 1 : 0; }
    async expire()              { return 1; }
    async ttl()                 { return -1; }
    async hset(key, field, val) { this.store[`${key}:${field}`] = val; return 1; }
    async hget(key, field)      { return this.store[`${key}:${field}`] ?? null; }
    async hgetall()             { return {}; }
    async lrange()              { return []; }
    async lpush()               { return 1; }
    async llen()                { return 0; }
    async zadd()                { return 1; }
    async zrange()              { return []; }
    async zcard()               { return 0; }
    async zrem()                { return 1; }
    async zrangebyscore()       { return []; }
    async zrangebyscoreBuffer() { return []; }
    async subscribe()           { return; }
    async unsubscribe()         { return; }
    async publish()             { return 1; }
    on(event, cb)               { return super.on(event, cb); }
    duplicate()                 { return new RedisMock(); }
    defineCommand()             { return; }
    async ping()                { return 'PONG'; }
    async quit()                { return 'OK'; }
    async disconnect()          { return; }
  }

  return RedisMock;
});

// Also mock the redis (v4) createClient used in redis.config.js
jest.mock('redis', () => ({
  createClient: () => ({
    isOpen: false,
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on:  jest.fn()
  })
}));
