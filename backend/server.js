const app = require("./src/app.js");
const connectDB = require("./src/db/db.js");
const config = require("./src/config/config.js"); // ✅ FIXED: Import the core default object directly without destructuring
const { runMasterPipeline } = require("./src/workers/feedWorker.js");

(async () => {
  try {
    // Connect to MongoDB Database
    await connectDB();

    // 2. Background scheduling loop
    // This runs the sync immediately on startup, then schedules it to repeat every 15 minutes
    runMasterPipeline();
    setInterval(runMasterPipeline, 15 * 60 * 1000);

    // ✅ FIXED: Safely pull the port property directly from the config object
    const PORT = config && config.port ? config.port : 3000;

    const server = app.listen(PORT, () => {
      console.log(
        `🚀 Engine active! Server running at: http://localhost:${PORT}`,
      );
    });

    server.on("error", (err) => {
      console.error("❌ Server failed to start:", err);
    });
  } catch (error) {
    console.error("💥 Bootstrapping failed critical error:", error);
    process.exit(1);
  }
})();