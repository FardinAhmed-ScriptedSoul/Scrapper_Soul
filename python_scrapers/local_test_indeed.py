import asyncio
import os
import urllib.parse
from playwright.async_api import async_playwright
from dotenv import load_dotenv  # type: ignore
from bs4 import BeautifulSoup   # pip install beautifulsoup4

# Load environment variables from .env
load_dotenv()

async def scrape_indeed():
    browser = None

    try:
        async with async_playwright() as p:
            try:
                print("🚀 Launching local Chromium browser...")
                browser = await p.chromium.launch(headless=False)

                # 🟢 FINE-TUNING 1: Pass real User-Agent identity parameters to the browser context
                context = await browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    viewport={'width': 1280, 'height': 800}
                )
                
                # 🟢 FINE-TUNING 2: Remove Playwright's automation footprints
                await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                page = await context.new_page()
            except Exception as e:
                print(f"[ERROR] Failed to launch local browser: {e}")
                return []

            # 🟢 FINE-TUNING 3: Establish initial authorization cookie session states
            print("🌐 Setting initial structural session state on base domain...")
            try:
                await page.goto("https://www.indeed.com", wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(2)
            except Exception as e:
                print(f"[WARNING] Base domain routing lookup failed: {e}")

            # Target URL setup
            url = "https://www.indeed.com/jobs?q=software+developer&l=New+York%2C+NY"
            print(f"🎯 Routing pipeline to query data layout: {url}")

            # Navigate
            try:
                response = await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                status = response.status if response else "No response"
                print(f"HTTP Status: {status}")
                await asyncio.sleep(3) # Settle dynamic scripts
            except Exception as e:
                print(f"[ERROR] Navigation failed: {e}")
                return []

            # Handle Cookie popup if it appears
            try:
                await page.wait_for_selector('#onetrust-accept-btn-handler', timeout=5000)
                await page.click('#onetrust-accept-btn-handler')
                print("[INFO] Cookie popup accepted.")
            except Exception:
                print("[INFO] No cookie popup found")

            # Indeed wraps its job cards inside container divs with the class 'job_seen_beacon'
            print("⏳ Waiting for job elements to load...")
            try:
                await page.wait_for_selector('.job_seen_beacon', timeout=15000)
            except Exception as e:
                print(f"[ERROR] Job cards not found: {e}")
                await page.screenshot(path="error_screenshot.png")
                print("[INFO] Saved error_screenshot.png to your project folder.")
                return []

            # Scroll down to trigger lazy loading elements
            try:
                print("📜 Scrolling down the page...")
                await page.mouse.wheel(0, 2000)
                await asyncio.sleep(2)
            except Exception as e:
                print(f"[WARNING] Scrolling failed: {e}")

            # Parse HTML
            try:
                html_content = await page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                cards = soup.select('.job_seen_beacon')[:10]

                if not cards:
                    print("[ERROR] No cards found in HTML parsing stage")
                    return []

                results = []

                for card in cards:
                    try:
                        title_link = card.select_one('h2.jobTitle a')
                        title_el = card.select_one('h2.jobTitle span')
                        
                        job_title = "N/A"
                        job_url = ""

                        # 🟢 GATEWAY FIX: Build a complete qualified link structure for LAUNCH NODE elements
                        if title_link:
                            job_title = title_link.get_text(strip=True)
                            relative_url = title_link.get('href')
                            if relative_url:
                                job_url = f"https://www.indeed.com{relative_url}"
                        elif title_el:
                            job_title = title_el.get_text(strip=True)

                        company_el = card.select_one('[data-testid="company-name"]')
                        location_el = card.select_one('[data-testid="text-location"]')
                        
                        # 🟢 EXTRACT METRICS: Parse target salary container info explicitly
                        salary_el = card.select_one('[data-testid="metadata-salary-info"]') or card.select_one('.salary-snippet-container')
                        salary_text = salary_el.get_text(strip=True) if salary_el else "Salary Range: Not disclosed"

                        results.append({
                            "title": job_title,
                            "url": job_url,
                            "company": company_el.get_text(strip=True) if company_el else "N/A",
                            "location": location_el.get_text(strip=True) if location_el else "N/A",
                            "yield_metrics": salary_text
                        })

                    except Exception as e:
                        print(f"[WARNING] Failed to parse card element: {e}")
                        continue

            except Exception as e:
                print(f"[ERROR] Parsing failed: {e}")
                return []

            # Output Results cleanly to terminal
            if not results:
                print("No results found.")
                return []

            print("\n" + "=" * 80)
            print("🎯 FRESH SCRAPED JOBS FROM INDEED:")
            print("=" * 80)

            for i, result in enumerate(results, 1):
                title = result.get("title")
                company = result.get("company")
                location = result.get("location")
                metrics = result.get("yield_metrics")
                job_link = result.get("url")
                print(f"\n[{i}] {title}")
                print(f"    🏢 Company: {company}")
                print(f"    📍 Location: {location}")
                print(f"    💵 Metrics: {metrics}")
                print(f"    🔗 Link: {job_link[:60]}...")

            print("\n" + "=" * 80)
            return results

    except Exception as e:
        print(f"[FATAL ERROR] {e}")
        return []

    finally:
        if browser:
            try:
                await browser.close()
                print("🔒 Browser safely closed.")
            except Exception as e:
                print(f"[WARNING] Failed to close browser: {e}")

if __name__ == "__main__":
    asyncio.run(scrape_indeed())