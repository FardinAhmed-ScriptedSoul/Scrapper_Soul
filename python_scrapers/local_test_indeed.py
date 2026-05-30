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
                # Launch Playwright LOCALLY instead of connecting to a remote cloud browser
                print("🚀 Launching local Chromium browser...")
                browser = await p.chromium.launch(headless=False)

                # Set up context and page
                context = await browser.new_context(viewport={'width': 1280, 'height': 800})
                page = await context.new_page()
            except Exception as e:
                print(f"[ERROR] Failed to launch local browser: {e}")
                return []

            # Target URL setup
            url = "https://www.indeed.com/jobs?q=software+developer&l=New+York%2C+NY"
            print(f"🌐 Navigating to: {url}")

            # Navigate
            try:
                response = await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                status = response.status if response else "No response"
                print(f"HTTP Status: {status}")
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

                # 🟢 FIX: Properly aligned loop block to prevent IndentationErrors
                for card in cards:
                    try:
                        # Fall back between anchor tags and spans to capture changing selectors
                        title_link = card.select_one('h2.jobTitle a')
                        title_el = card.select_one('h2.jobTitle span')
                        
                        if title_link:
                            job_title = title_link.get_text(strip=True)
                        elif title_el:
                            job_title = title_el.get_text(strip=True)
                        else:
                            job_title = "N/A"

                        company_el = card.select_one('[data-testid="company-name"]')
                        location_el = card.select_one('[data-testid="text-location"]')

                        results.append({
                            "title": job_title,
                            "company": company_el.get_text(strip=True) if company_el else "N/A",
                            "location": location_el.get_text(strip=True) if location_el else "N/A"
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
                print(f"\n[{i}] {title}")
                print(f"    🏢 Company: {company}")
                print(f"    📍 Location: {location}")

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