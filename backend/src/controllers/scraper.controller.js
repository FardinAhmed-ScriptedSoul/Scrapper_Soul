const { spawn } = require('child_process');
const path = require('path');
const config = require('../config/config.js');
const { amazonBooks, bookingHotels, indeedJobs, posts } = require('../repositories');

// Helper function to extract a clean floating-point number for ratings (e.g., "Scored 8.2" -> 8.2)
const parseRatingToNumber = (ratingStr) => {
  if (!ratingStr || ratingStr === "N/A") return 0;
  const match = ratingStr.match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : 0;
};

// ✅ FIXED PIPELINE TARGET: Points node directly to your root venv python.exe
const pythonExecutable = config.python.executable;

// ==========================================
// 1. AMAZON CONTROLLER
// ==========================================
const searchAmazon = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ success: false, error: "Query parameter is required" });
    const normalizedQuery = query.trim().toLowerCase();

    const cachedData = await amazonBooks.find({
      userId: req.user._id,
      searchTerm: normalizedQuery
    });
    if (cachedData.length > 0) {
      return res.status(200).json({
        success: true,
        source: "mongodb_cache",
        count: cachedData.length,
        data: cachedData
      });
    }

    const scriptPath = path.resolve(__dirname, '../../../python_scrapers/stealth/amazon_stealth.py');
    // ✅ FIXED: Spawns using the venv python executable explicitly
    const pythonProcess = spawn(pythonExecutable, [scriptPath, normalizedQuery]);

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
          userId: req.user._id,
          searchTerm: normalizedQuery,
          title: item.title,
          authors: item.authors || [],
          price: item.price,
          rating: item.rating,
          reviewsCount: item.reviewsCount || 0,
          productUrl: item.productUrl,
          imageUrl: item.imageUrl || ""
        }));

        const savedData = await amazonBooks.insertMany(recordsToSave);
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
    let normalizedLoc = location.trim().toLowerCase();

    if (["on site", "onsite"].includes(normalizedLoc)) normalizedLoc = "onsite";
    else if (normalizedLoc === "hybrid") normalizedLoc = "hybrid";
    else if (["remote", "anywhere"].includes(normalizedLoc)) normalizedLoc = "remote";

    // ── Cache check ───────────────────────────────────────────────────────────
    const cachedData = await indeedJobs.find({
      userId: req.user._id,
      jobTitleQuery: normalizedRole,
      locationQuery: normalizedLoc
    });
    if (cachedData.length > 0) {
      return res.status(200).json({ success: true, source: "mongodb_cache", count: cachedData.length, data: cachedData });
    }

    // ── Spawn Python scraper ──────────────────────────────────────────────────
    const scriptPath = path.resolve(__dirname, '../../../python_scrapers/stealth/indeed_stealth.py');
    const pythonProcess = spawn(pythonExecutable, [scriptPath, normalizedRole, normalizedLoc]);

    let dataBuffer = "";
    let errorBuffer = "";
    pythonProcess.stdout.on('data', (data) => { dataBuffer += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorBuffer += data.toString(); });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error(`❌ Indeed scraper exited with code ${code}:`, errorBuffer.slice(0, 300));
        return res.status(500).json({ success: false, error: "Indeed stealth engine failure." });
      }

      const trimmedOutput = dataBuffer.trim();

      if (!trimmedOutput) {
        console.error("❌ Indeed script returned empty output.");
        return res.status(500).json({ success: false, error: "Indeed returned no data. Possible bot detection." });
      }

      let parsedItems;
      try {
        parsedItems = JSON.parse(trimmedOutput);
      } catch (jsonErr) {
        console.error("❌ Indeed JSON parse failed. Raw:", trimmedOutput.slice(0, 300));
        return res.status(500).json({ success: false, error: "Failed to parse Indeed script output." });
      }

      if (!Array.isArray(parsedItems)) {
        return res.status(500).json({ success: false, error: parsedItems.error || "Unexpected Indeed output." });
      }

      if (parsedItems.length === 0) {
        return res.status(200).json({ success: true, source: "live_stealth_scraper", count: 0, data: [] });
      }

      // ── Persist to MongoDB ────────────────────────────────────────────────
      try {
        const recordsToSave = parsedItems.map(item => ({
          userId: req.user._id,
          jobTitleQuery: normalizedRole,
          locationQuery: normalizedLoc,
          title:          item.title    || "Job Opportunity",
          company:        item.company  || "N/A",
          location:       item.location || "Remote / Unspecified",
          salaryInfo:     item.salaryText || item.salaryInfo || "Not Disclosed",
          benefits:       Array.isArray(item.benefits) ? item.benefits : [],
          jobUrl:         item.jobUrl   || "https://www.indeed.com",
          salaryEnriched: false
        }));

        const savedData = await indeedJobs.insertMany(recordsToSave);

        // ── Fire-and-forget background salary enrichment ──────────────────
        // Runs after response is sent — visits each detail page silently,
        // updates salaryInfo + salaryEnriched flag in MongoDB for future use.
        enrichSalariesInBackground(savedData).catch(err =>
          console.error("❌ Background salary enrichment error:", err.message)
        );

        return res.status(200).json({
          success: true,
          source: "live_stealth_scraper",
          count: savedData.length,
          data: savedData
        });
      } catch (dbErr) {
        console.error("❌ Indeed MongoDB Write Exception:", dbErr);
        return res.status(500).json({ success: false, error: "Database write failed.", details: dbErr.message });
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ── Background salary enrichment ─────────────────────────────────────────────
// Fires after res.json() — user never waits for this.
// Visits each /viewjob page, scrapes salary, patches the MongoDB doc.
// On next cache hit that document will have real salary data.
const enrichSalariesInBackground = async (savedDocs) => {
  const { chromium } = require('playwright');
  const cheerio = require('cheerio');

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled", "--disable-infobars"]
    });

    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      locale: "en-US"
    });

    for (const doc of savedDocs) {
      // Skip if already enriched or no real job URL
      if (doc.salaryEnriched || !doc.jobUrl.includes('jk=')) continue;

      try {
        const page = await context.newPage();
        await page.goto(doc.jobUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(2000);

        const html = await page.content();
        await page.close();

        const $ = cheerio.load(html);

        // Indeed detail page salary — try selectors in priority order
        let salaryText = '';
        const salarySelectors = [
          '#salaryInfoAndJobType span',
          '[data-testid="attribute_snippet_testid"]',
          '[class*="salary"] span',
          '[class*="Salary"] span',
        ];
        for (const sel of salarySelectors) {
          const text = $(sel).first().text().trim();
          if (text) { salaryText = text; break; }
        }

        if (salaryText) {
          await indeedJobs.findByIdAndUpdate(doc._id, {
            salaryInfo: salaryText,
            salaryEnriched: true
          });
          console.log(`✅ Salary enriched [${doc.title}]: ${salaryText}`);
        } else {
          // No salary on detail page either — mark done to avoid re-visiting
          await indeedJobs.findByIdAndUpdate(doc._id, { salaryEnriched: true });
          console.log(`ℹ️  No salary found for [${doc.title}] — marked enriched`);
        }

      } catch (err) {
        console.warn(`⚠️  Enrichment skipped [${doc.jobUrl}]: ${err.message}`);
        // Don't mark enriched — will retry on next scrape cycle for this query
      }

      // 2s delay between requests — avoids rate limiting / bot detection
      await new Promise(r => setTimeout(r, 2000));
    }

  } finally {
    if (browser) await browser.close();
    console.log("✅ Background salary enrichment pass complete.");
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

    // 1. Try to fulfill request via Mongo Cache Layer
    const cachedData = await bookingHotels.find({
      userId: req.user._id,
      destinationQuery: targetDest, 
      checkInDate: targetIn, 
      checkOutDate: targetOut 
    });

    if (cachedData.length > 0) {
      return res.status(200).json({
        success: true,
        source: "mongodb_cache",
        count: cachedData.length,
        data: cachedData // 🟢 ALIGNED: Returns direct schema objects containing .hotelUrl
      });
    }

    // 2. Fallback to live data generation pipeline
    const scriptPath = path.resolve(__dirname, '../../../python_scrapers/stealth/booking_stealth.py');
    const pythonProcess = spawn(pythonExecutable, [scriptPath, targetDest, targetIn, targetOut]);

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
        console.error("❌ Booking JSON Parse Exception:", trimmedOutput);
        return res.status(500).json({ success: false, error: "Could not parse JSON output from Booking script." });
      }

      if (parsedItems.error) return res.status(500).json({ success: false, error: parsedItems.error });

      try {
        const recordsToSave = parsedItems.map(item => ({
          userId: req.user._id,
          destinationQuery: targetDest, 
          checkInDate: targetIn,
          checkOutDate: targetOut,
          hotelName: item.title,         
          hotelUrl: item.url || item.hotelUrl || "", // Reconciles python output stream variables
          location: item.location,
          priceText: item.priceText,
          rating: Number(item.rating) || 0, 
          imageUrl: item.imageUrl
        }));

        const savedData = await bookingHotels.insertMany(recordsToSave);
        
        // 🟢 MATCHES AMAZON PATTERN: Returns savedData directly to resolve frontend hover element issues
        return res.status(200).json({ 
          success: true, 
          source: "live_stealth_scraper", 
          count: savedData.length, 
          data: savedData 
        });
      } catch (dbErr) {
        console.error("❌ Booking MongoDB Write Exception:", dbErr);
        return res.status(500).json({ success: false, error: "Database rejected parsed Booking items.", details: dbErr.message });
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getNewsFeed = async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ success: false, error: "Category property filter parameter required." });

    const feedPosts = await posts.find(
      { category },
      { sort: { publishedAt: -1 }, limit: 40 }
    );

    return res.status(200).json({
      success: true,
      count: feedPosts.length,
      data: feedPosts
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  searchAmazon,
  searchIndeed,
  searchBooking,
  getNewsFeed 
};