const { users } = require('../repositories');
const { sendEmail } = require('./mail.services.js');

const registeredQueues = new WeakSet();

const deliverNotification = async (job, event, details) => {
  const userId = job?.data?.userId;
  if (!userId) return;

  try {
    const user = await users.findById(userId);
    const preferences = user?.notificationPreferences;
    if (
      !user?.email ||
      !preferences?.enabled ||
      !preferences.events?.[event]
    ) {
      return;
    }

    const engine = job.data.engine || 'scrape';
    const query = job.data.query || '';
    const successful = event === 'completed';
    const status = successful ? 'completed' : 'failed';
    const subject = `Scrapper-Soul: ${engine} task ${status}`;
    const text = successful
      ? `Your ${engine} search${query ? ` for "${query}"` : ''} completed successfully. Records saved: ${details?.savedCount ?? 0}.`
      : `Your ${engine} search${query ? ` for "${query}"` : ''} failed after its retry attempts. Error: ${details?.message || 'Unknown error'}`;

    await sendEmail(user.email, subject, text);
  } catch (error) {
    console.error(`Job ${event} notification delivery failed for job ${job.id}:`, error.message);
  }
};

const registerJobNotifications = (queue) => {
  if (!queue || registeredQueues.has(queue)) return;
  registeredQueues.add(queue);

  queue.on('completed', (job, result) => {
    void deliverNotification(job, 'completed', result);
  });
  queue.on('failed', (job, error) => {
    const configuredAttempts = Number(job?.opts?.attempts) || 1;
    const attemptsMade = Number(job?.attemptsMade) || 0;
    if (attemptsMade < configuredAttempts) return;

    void deliverNotification(job, 'failed', error);
  });
};

module.exports = { registerJobNotifications };
