const { savedSearchPresets } = require('../repositories');
const scrapeQueue = require('../queues/scrapeQueue.js');

const validDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const normalizePreset = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Preset data is required.' };
  }
  const { name, engine, query } = body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
    return { error: 'A preset name of 1 to 80 characters is required.' };
  }
  if (!['amazon', 'indeed', 'booking'].includes(engine)) {
    return { error: 'Choose a supported scraper source.' };
  }
  if (typeof query !== 'string' || !query.trim() || query.trim().length > 200) {
    return { error: 'A search query of 1 to 200 characters is required.' };
  }

  const preset = {
    name: name.trim(),
    engine,
    query: query.trim().toLowerCase(),
    location: '',
    checkIn: '',
    checkOut: ''
  };

  if (engine === 'indeed') {
    if (typeof body.location !== 'string' || !body.location.trim() || body.location.trim().length > 200) {
      return { error: 'Indeed presets require a location of 1 to 200 characters.' };
    }
    preset.location = body.location.trim().toLowerCase();
  }

  if (engine === 'booking') {
    if (!validDate(body.checkIn) || !validDate(body.checkOut) || body.checkOut <= body.checkIn) {
      return { error: 'Booking presets require valid check-in and check-out dates in YYYY-MM-DD order.' };
    }
    preset.checkIn = body.checkIn;
    preset.checkOut = body.checkOut;
  }

  return { preset };
};

exports.listPresets = async (req, res) => {
  try {
    const presets = await savedSearchPresets.find(
      { userId: req.user._id },
      { sort: { createdAt: -1 } }
    );
    return res.status(200).json({ success: true, data: presets });
  } catch (error) {
    console.error('Failed to load saved search presets:', error);
    return res.status(500).json({ success: false, message: 'Failed to load saved search presets.' });
  }
};

exports.createPreset = async (req, res) => {
  const { preset, error } = normalizePreset(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const saved = await savedSearchPresets.create({ ...preset, userId: req.user._id });
    return res.status(201).json({ success: true, data: saved });
  } catch (saveError) {
    console.error('Failed to create saved search preset:', saveError);
    return res.status(500).json({ success: false, message: 'Failed to create saved search preset.' });
  }
};

exports.updatePreset = async (req, res) => {
  const { preset, error } = normalizePreset(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const saved = await savedSearchPresets.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: preset },
      { returnDocument: 'after', runValidators: true }
    );
    if (!saved) return res.status(404).json({ success: false, message: 'Saved preset not found.' });
    return res.status(200).json({ success: true, data: saved });
  } catch (errorOnUpdate) {
    console.error('Failed to update saved search preset:', errorOnUpdate);
    return res.status(500).json({ success: false, message: 'Failed to update saved search preset.' });
  }
};

exports.deletePreset = async (req, res) => {
  try {
    const deleted = await savedSearchPresets.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!deleted) return res.status(404).json({ success: false, message: 'Saved preset not found.' });
    return res.status(200).json({ success: true, message: 'Saved preset deleted.' });
  } catch (error) {
    console.error('Failed to delete saved search preset:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete saved search preset.' });
  }
};

exports.runPreset = async (req, res) => {
  try {
    const preset = await savedSearchPresets.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!preset) return res.status(404).json({ success: false, message: 'Saved preset not found.' });

    const job = await scrapeQueue.add({
      engine: preset.engine,
      query: preset.query,
      location: preset.location,
      checkIn: preset.checkIn,
      checkOut: preset.checkOut,
      userId: req.user._id,
      presetId: preset._id.toString()
    }, {
      jobId: `preset-${preset._id}-${Date.now()}`
    });

    return res.status(202).json({
      success: true,
      data: { jobId: job.id, engine: preset.engine, query: preset.query }
    });
  } catch (error) {
    console.error('Failed to queue saved search preset:', error);
    return res.status(500).json({ success: false, message: 'Failed to queue saved search preset.' });
  }
};
