const EventEmitter = require('events');

jest.mock('../../../../src/repositories', () => ({
  users: { findById: jest.fn() }
}));

jest.mock('../../../../src/services/mail.services.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

const { users } = require('../../../../src/repositories');
const { sendEmail } = require('../../../../src/services/mail.services.js');
const { registerJobNotifications } = require('../../../../src/services/jobNotification.services.js');

const flushAsyncHandlers = () => new Promise((resolve) => setImmediate(resolve));

describe('Job notification delivery', () => {
  let queue;

  beforeEach(() => {
    jest.clearAllMocks();
    queue = new EventEmitter();
    users.findById.mockResolvedValue({
      email: 'owner@example.com',
      notificationPreferences: {
        enabled: true,
        events: { completed: true, failed: true }
      }
    });
  });

  it('emails opted-in users after a completed job', async () => {
    registerJobNotifications(queue);
    queue.emit('completed', {
      id: 'job-1',
      data: { userId: 'owner-id', engine: 'amazon', query: 'python books' }
    }, { savedCount: 4 });

    await flushAsyncHandlers();

    expect(sendEmail).toHaveBeenCalledWith(
      'owner@example.com',
      expect.stringContaining('amazon task completed'),
      expect.stringContaining('Records saved: 4')
    );
  });

  it('notifies only after the final failed attempt', async () => {
    registerJobNotifications(queue);
    const job = {
      id: 'job-2',
      data: { userId: 'owner-id', engine: 'indeed', query: 'developer' },
      opts: { attempts: 3 },
      attemptsMade: 2
    };
    queue.emit('failed', job, new Error('Temporary provider error'));
    await flushAsyncHandlers();
    expect(sendEmail).not.toHaveBeenCalled();

    job.attemptsMade = 3;
    queue.emit('failed', job, new Error('Final provider error'));
    await flushAsyncHandlers();

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      'owner@example.com',
      expect.stringContaining('indeed task failed'),
      expect.stringContaining('Final provider error')
    );
  });

  it('does not send email when notifications are opted out', async () => {
    users.findById.mockResolvedValue({
      email: 'owner@example.com',
      notificationPreferences: { enabled: false, events: { completed: true, failed: true } }
    });
    registerJobNotifications(queue);
    queue.emit('completed', { id: 'job-3', data: { userId: 'owner-id' } }, {});

    await flushAsyncHandlers();

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('logs delivery errors without throwing from the queue event handler', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    sendEmail.mockRejectedValueOnce(new Error('Mail service unavailable'));
    registerJobNotifications(queue);

    expect(() => queue.emit('completed', {
      id: 'job-4',
      data: { userId: 'owner-id', engine: 'amazon', query: 'python' }
    }, { savedCount: 1 })).not.toThrow();

    await flushAsyncHandlers();

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Job completed notification delivery failed'),
      'Mail service unavailable'
    );
    consoleError.mockRestore();
  });
});
