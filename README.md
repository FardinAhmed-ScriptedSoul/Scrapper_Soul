# Web_Scrapping_Using_Python
A simple SCRAPPING tool


Website
   │
   ▼
HTTP Request Sent
   │
   ▼
HTML Response Received
   │
   ▼
Parser Reads HTML
   │
   ▼
Extract Required Data
   │
   ▼
Save to:
- CSV
- Database
- JSON
- Excel




Full Real-Life Example

Amazon Website
      │
      ▼
Scraper Fetches HTML
      │
      ▼
Extract:
- Name
- Price
- Rating
      │
      ▼
Store in MongoDB
      │
      ▼
Display in Dashboard


#ABOUT THIS TOOL
📚 Web Scrapyard: Advanced Multi-Platform Scrapers
A high-performance, asynchronous web scraping repository built with Python, Playwright, and BeautifulSoup4. This codebase is explicitly designed to scrape data from high-security web targets (Amazon, Booking.com, and Indeed) using two distinct operational patterns: a lightweight Local Emulation Layer and an enterprise-grade Cloud Proxy Network Integration (Evomi).

🏗️ System Architecture & Workflow


┌────────────────────────────────────────────────────────────────────────┐
 │                      DEVELOPER WORKSPACE (Local Script)                │
 └───────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
        Is Evomi Proxy Configured?
                     │
      ┌──────────────┴──────────────┐
      ▼ NO                          ▼ YES
┌───────────────────────────┐ ┌───────────────────────────┐
│   LOCAL EMULATION MODE    │ │    CLOUD PROXY MODE       │
│  (Playwright Local Node)  │ │ (Evomi Residential/CDP)   │
└─────────────┬─────────────┘ └─────────────┬─────────────┘
              │                             │
              ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ • Headless=False Engine   │ │ • Dynamic Residential IP  │
│ • Custom User-Agent Injection││ • Cloud-Side Fingerprinting│
│ • Mimic Human Interactions│ │ • Automated CAPTCHA Evading│
└─────────────┬─────────────┘ └─────────────┬─────────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                             ▼
               ┌───────────────────────────┐
               │    TARGET FIREWALL WALLS  │
               │ (Amazon, Booking, Indeed) │
               └─────────────┬─────────────┘
                             │ (Bypassed Successfully)
                             ▼
               ┌───────────────────────────┐
               │   BEAUTIFULSOUP 4 PARSER  │
               │ • DOM Tree Normalization  │
               │ • Regex Float Cleansing   │
               └─────────────┬─────────────┘
                             │
                             ▼
               ┌───────────────────────────┐
               │    CLEAN DATA OUTPUT      │
               │  Structured Terminal Logs │
               └───────────────────────────┘



✨ Features & Target Breakdown
1. Amazon Book Intelligence Scraper
Bypass Strategy: Overrides standard scraper blocks by spoofing standard high-resolution Windows Chrome user agents and simulating visual layout rendering.

Data Extracted: Item Titles, Complete Authors Listing, Price Float Normalization ($XX.XX), Average Star Ratings, Aggregated Customer Review Counts, and CDN Image Target Links.

2. Booking.com Accommodations Engine
Bypass Strategy: Executes native DOM scrolling matrix injections to trigger lazy-loading content arrays, auto-handles annoying European Cookie Consent banner blockages, and waits for key elements to settle before parsing.

Data Extracted: Hotel/Property Identifiers and Filtered Customer Review Metric Scores.

3. Indeed Career Pipeline Scraper
Bypass Strategy: Uses safe, structural tag-parent fallback algorithms (h2.jobTitle) to read through modern obfuscation patterns and class names.

Data Extracted: Job Roles, Company Names, and Targeted Geographical/Hybrid Job Locations.

🚀 Getting Started
Prerequisites
Python 3.10+

Node.js (Required for internal Playwright system binaries)

📦 Installation & Environment Setup
Clone the repository to your desktop workspace:

Bash
git clone https://github.com/FardinAhmed-ScriptedSoul/Web_Scrapping_Using_Python.git
cd Web_Scrapping_Using_Python
Initialize your isolated Python Virtual Environment:

Bash
python -m venv venv
source venv/Scripts/activate  # On Windows Git Bash
# source venv/bin/activate    # On macOS/Linux
Install the required runtime dependencies:

Bash
pip install playwright beautifulsoup4 python-dotenv requests
Provision your local automated browser binaries:

Bash
playwright install chromium
Configure your Local Environment File:
Create a file named .env in the root directory of your project:

Code snippet
# --- Base URLs ---
BASE_URL_AMAZON=https://www.amazon.com

# --- Evomi Cloud Proxy Configurations ---
API_KEY_BROWSER=your_evomi_browser_api_key_here
EVOMI_PROXY_ENDPOINT_HOST=your_evomi_host_here
USER_NAME=your_evomi_auth_username
PASSWORD=your_evomi_auth_password
🔒 Security Notice: The .env file and venv/ dependency tree are explicitly registered inside the project's .gitignore layer to ensure secrets never leak to public repositories.

💻 Execution Protocols
Mode A: Zero-Cost Local Emulation (Playwright Local Node)
These scripts deploy a browser directly on your desktop machine, configuring context headers to naturally slide past basic tracking walls:

Bash
# Execute local Amazon Inventory Tracker
python local_test_amazon.py

# Execute local Booking Hotel Scraper
python local_test_booking.py

# Execute local Indeed Career Scraper
python local_test_indeed.py
Mode B: Enterprise Proxy Routing (Evomi Network Infrastructure)
These production scripts shift the extraction workload off your network, routing requests through cloud-based residential rotation networks to confidently scale up extraction volume:

Bash
# Execute Enterprise Proxied Scripts
python ScrapeAmazonEvomiCoreResidential.py
python ScrapeBookingEvomiScrapingBrowser.py
python ScrapeIndeedEvomiScraperAPI.py
📊 Sample Terminal Output Data Structure
When execution finishes, the data is structured and logged into clean, database-ready readouts:

Plaintext
============================================================
📚 Found 24 results
============================================================

[1] Java: The Complete Reference, Thirteenth Edition
------------------------------------------------------------
👤 Authors : Herbert Schildt
💰 Price   : $38.11
⭐ Rating  : 4.9
📝 Reviews : 93
🔗 URL     : https://www.amazon.com/Java-Complete-Reference...
🖼️ Image  : https://m.media-amazon.com/images/I/81UDSuaFAeL...

============================================================
🔒 Browser safely closed.
⚖️ License
Distributed under the MIT License. See LICENSE for details.