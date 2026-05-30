const { spawn } = require('child_process');
const path = require('path');
const AmazonBook = require('../models/amazon.model.js');
const IndeedJob = require('../models/indeed.model.js');
const BookingHotel = require('../models/booking.model.js');

// Helper function to extract a clean floating-point number for ratings (e.g., "Scored 8.2" -> 8.2)
const parseRatingToNumber = (ratingStr) => {
  if (!ratingStr || ratingStr === "N/A") return 0;
  const match = ratingStr.match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : 0;
};

// ==========================================
// 1. AMAZON CONTROLLER
// ==========================================
const searchAmazon = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, error: "Query parameter is required" });
    const normalizedQuery = query.trim().toLowerCase();

    const cachedData = await AmazonBook.find({ searchTerm: normalizedQuery });
    if (cachedData.length > 0) {
      return res.status(200).json({
        success: true,
        source: "mongodb_cache",
        count: cachedData.length,
        data: cachedData
      });
    }

    const scriptPath = path.resolve(__dirname, '../../../python_scrapers/stealth/amazon_stealth.py');
    const pythonProcess = spawn('python', [scriptPath, normalizedQuery]);

    let dataBuffer = "";
    let errorBuffer = "";

    pythonProcess.stdout.on('data', (data) => { dataBuffer += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorBuffer += data.toString(); });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`❌ Amazon Script Exit Code: ${code}. StdErr: ${errorBuffer}`);
        return res.status(500).json({ success: false, error: "Amazon Stealth engine failure." });
      }
      try {
        const parsedItems = JSON.parse(dataBuffer.trim());
        if (parsedItems.error) return res.status(500).json({ success: false, error: parsedItems.error });

        const recordsToSave = parsedItems.map(item => ({
          searchTerm: normalizedQuery,
          title: item.title,
          authors: item.authors || [],
          price: item.price,
          rating: item.rating,
          reviewsCount: item.reviewsCount || 0,
          productUrl: item.productUrl,
          imageUrl: item.imageUrl || ""
        }));

        const savedData = await AmazonBook.insertMany(recordsToSave);
        return res.status(200).json({ success: true, source: "live_stealth_scraper", count: savedData.length, data: savedData });
      } catch (err) {
        console.error("❌ Amazon System Exception Processing Stack:", err);
        return res.status(500).json({ success: false, error: "Amazon pipeline ingestion synchronization error.", details: err.message });
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// 2. INDEED CONTROLLER
// ==========================================
const searchIndeed = async (req, res) => {
  try {
    const { role, location } = req.query;
    if (!role || !location) {
      return res.status(400).json({ success: false, error: "Both role and location parameters are required." });
    }
    
    const normalizedRole = role.trim().toLowerCase();
    const normalizedLoc = location.trim().toLowerCase();

    // Query adjusted to look for your correct Mongoose structural fields
    const cachedData = await IndeedJob.find({ jobTitleQuery: normalizedRole, locationQuery: normalizedLoc });
    if (cachedData.length > 0) {
      return res.status(200).json({
        success: true,
        source: "mongodb_cache",
        count: cachedData.length,
        data: cachedData
      });
    }

    const scriptPath = path.resolve(__dirname, '../../../python_scrapers/stealth/indeed_stealth.py');
    const pythonProcess = spawn('python', [scriptPath, normalizedRole, normalizedLoc]);

    let dataBuffer = "";
    let errorBuffer = "";

    pythonProcess.stdout.on('data', (data) => { dataBuffer += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorBuffer += data.toString(); });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`❌ Indeed Script Exit Code: ${code}. StdErr: ${errorBuffer}`);
        return res.status(500).json({ success: false, error: "Indeed Stealth connection dropped." });
      }
      
      const trimmedOutput = dataBuffer.trim();
      let parsedItems;
      
      try {
        parsedItems = JSON.parse(trimmedOutput);
      } catch (jsonErr) {
        console.error("❌ Indeed JSON Parse Exception. Raw buffer output was:", trimmedOutput);
        return res.status(500).json({ success: false, error: "Failed to cleanly parse data streaming output from the Indeed script." });
      }

      if (parsedItems.error) return res.status(500).json({ success: false, error: parsedItems.error });

      try {
        // Aligned perfectly with your Mongoose structural fields
        const recordsToSave = parsedItems.map(item => ({
          jobTitleQuery: normalizedRole, 
          locationQuery: normalizedLoc,  
          title: item.title,
          company: item.company,
          location: item.location,
          salaryText: item.salaryText,
          jobUrl: item.jobUrl
        }));

        const savedData = await IndeedJob.insertMany(recordsToSave);
        return res.status(200).json({ success: true, source: "live_stealth_scraper", count: savedData.length, data: savedData });
      } catch (dbErr) {
        console.error("❌ Indeed MongoDB Write/Validation Exception:", dbErr);
        return res.status(500).json({ success: false, error: "Database rejected parsed Indeed items constraint layout.", details: dbErr.message });
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// 3. BOOKING CONTROLLER
// ==========================================
const searchBooking = async (req, res) => {
  try {
    const { destination, checkIn, checkOut } = req.query;
    if (!destination || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, error: "Destination, checkIn, and checkOut parameters are required." });
    }
    
    const targetDest = destination.trim().toLowerCase();
    const targetIn = checkIn.trim();
    const targetOut = checkOut.trim();

    // Query adjusted to match your correct model keys
    const cachedData = await BookingHotel.find({ destinationQuery: targetDest, checkInDate: targetIn, checkOutDate: targetOut });
    if (cachedData.length > 0) {
      return res.status(200).json({
        success: true,
        source: "mongodb_cache",
        count: cachedData.length,
        data: cachedData
      });
    }

    const scriptPath = path.resolve(__dirname, '../../../python_scrapers/stealth/booking_stealth.py');
    const pythonProcess = spawn('python', [scriptPath, targetDest, targetIn, targetOut]);

    let dataBuffer = "";
    let errorBuffer = "";

    pythonProcess.stdout.on('data', (data) => { dataBuffer += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorBuffer += data.toString(); });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`❌ Booking Script Exit Code: ${code}. StdErr: ${errorBuffer}`);
        return res.status(500).json({ success: false, error: "Booking Automation runtime pipeline broke." });
      }

      const trimmedOutput = dataBuffer.trim();
      let parsedItems;

      try {
        parsedItems = JSON.parse(trimmedOutput);
      } catch (jsonErr) {
        console.error("❌ Booking JSON Parse Exception. Raw buffer output was:", trimmedOutput);
        return res.status(500).json({ success: false, error: "Could not parse JSON array data streams from Booking script." });
      }

      if (parsedItems.error) return res.status(500).json({ success: false, error: parsedItems.error });

      try {
        // Aligned fields with your Schema validation requirements and cast string to number
        const recordsToSave = parsedItems.map(item => ({
          destinationQuery: targetDest, 
          checkInDate: targetIn,
          checkOutDate: targetOut,
          hotelName: item.title,         
          hotelUrl: item.hotelUrl,
          location: item.location,
          priceText: item.priceText,
          rating: parseRatingToNumber(item.rating), 
          imageUrl: item.imageUrl
        }));

        const savedData = await BookingHotel.insertMany(recordsToSave);
        return res.status(200).json({ success: true, source: "live_stealth_scraper", count: savedData.length, data: savedData });
      } catch (dbErr) {
        console.error("❌ Booking MongoDB Write/Validation Exception:", dbErr);
        return res.status(500).json({ success: false, error: "Database rejected parsed Booking items constraint layout.", details: dbErr.message });
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


const Post = require('../models/post.model.js');

const getNewsFeed = async (req, res) => {
  try {
    const { category } = req.query; // e.g., ?category=osint
    if (!category) return res.status(400).json({ success: false, error: "Category property filter parameter required." });

    // Instantly find matching records sorted by newest first
    const posts = await Post.find({ category })
                            .sort({ publishedAt: -1 })
                            .limit(40); // Keep dashboard interface lightning snappy

    return res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Don't forget to append it to your module.exports at the bottom of the file!
module.exports = {
  searchAmazon,
  searchIndeed,
  searchBooking,
  getNewsFeed 
};

