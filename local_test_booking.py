import asyncio
import os
import urllib.parse
from playwright.async_api import async_playwright
from dotenv import load_dotenv  # type: ignore
from bs4 import BeautifulSoup   # pip install beautifulsoup4

# Load environment variables from .env
load_dotenv()

async def scrape_booking():
    browser = None

    try:
        async with async_playwright() as p:
            try:
                # 🟢 UPDATE 1: Launch Playwright LOCALLY instead of using Evomi's cloud browser
                print("🚀 Launching local Chromium browser...")
                browser = await p.chromium.launch(headless=False)

                # Set up context and page
                context = await browser.new_context(viewport={'width': 1280, 'height': 800})
                page = await context.new_page()
            except Exception as e:
                print(f"[ERROR] Failed to launch local browser: {e}")
                return []

            # Query setup for Booking.com
            query = 'New York'
            encoded_query = urllib.parse.quote(query)
            url = f"https://www.booking.com/searchresults.html?ss={encoded_query}"
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

            # Wait for hotel property cards to appear on screen
            print("⏳ Waiting for property cards to load...")
            try:
                await page.wait_for_selector('[data-testid="property-card"]', timeout=15000)
            except Exception as e:
                print(f"[ERROR] Property cards not found: {e}")
                await page.screenshot(path="booking_error.png")
                print("[INFO] Saved booking_error.png to your project folder.")
                return []

            # Smooth scroll down to trick lazy loaders
            try:
                print("📜 Scrolling down the page...")
                await page.mouse.wheel(0, 3000)
                await asyncio.sleep(2)
            except Exception as e:
                print(f"[WARNING] Scrolling failed: {e}")

            # Parse HTML content with BeautifulSoup
            try:
                html_content = await page.content()
                soup = BeautifulSoup(html_content, "html.parser")
                cards = soup.select('[data-testid="property-card"]')[:10]

                if not cards:
                    print("[ERROR] No cards found in HTML parsing stage")
                    return []

                results = []

                for card in cards:
                    try:
                        # 🟢 UPDATE 2: Booking target fallback logic
                        # Dynamic layouts can hide names in divs, spans, or a tags under data-testid
                        name_el = card.select_one('[data-testid="title"]')
                        rating_el = card.select_one('[data-testid="review-score"]')

                        # Clean up text strings
                        hotel_name = name_el.get_text(strip=True) if name_el else "N/A"
                        hotel_rating = rating_el.get_text(strip=True) if rating_el else "No rating"
                        
                        # Extra cleanup: Booking often drops "Scored" or structural elements into raw rating strings
                        if "Scored" in hotel_rating:
                            hotel_rating = hotel_rating.replace("Scored", "").strip()

                        results.append({
                            "name": hotel_name,
                            "rating": hotel_rating
                        })

                    except Exception as e:
                        print(f"[WARNING] Failed to parse card element: {e}")
                        continue

            except Exception as e:
                print(f"[ERROR] Parsing failed: {e}")
                return []

            # Clean output display loop
            if not results:
                print("No results found.")
                return []

            print("\n" + "=" * 80)
            print("🏨 FRESH SCRAPED HOTELS FROM BOOKING.COM:")
            print("=" * 80)

            for i, result in enumerate(results, 1):
                name = result.get("name")
                rating = result.get("rating")
                print(f"\n[{i}] {name}")
                print(f"    ⭐ Rating: {rating}")

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
    asyncio.run(scrape_booking())