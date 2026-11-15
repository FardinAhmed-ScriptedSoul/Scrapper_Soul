const { users } = require('../repositories');

const serializePreferences = (preferences) => ({
  enabled: Boolean(preferences?.enabled),
  events: {
    completed: preferences?.events?.completed !== false,
    failed: preferences?.events?.failed !== false
  }
});

exports.getPreferences = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: serializePreferences(req.user.notificationPreferences)
  });
};

exports.updatePreferences = async (req, res) => {
  const { enabled, events } = req.body;
  if (
    typeof enabled !== 'boolean' ||
    !events ||
    typeof events !== 'object' ||
    Array.isArray(events) ||
    typeof events.completed !== 'boolean' ||
    typeof events.failed !== 'boolean'
  ) {
    return res.status(400).json({
      success: false,
      message: 'enabled and both completed/failed event preferences must be booleans.'
    });
  }

  try {
    const user = await users.findByIdAndUpdate(
      req.user._id,
      { $set: { notificationPreferences: { enabled, events } } },
      { returnDocument: 'after', runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      data: serializePreferences(user.notificationPreferences)
    });
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification preferences.' });
  }
};
