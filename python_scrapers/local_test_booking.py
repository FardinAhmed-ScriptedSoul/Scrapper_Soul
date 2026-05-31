import asyncio
import os
import sys
import json
import urllib.parse
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup   # pip install beautifulsoup4

async def scrape_booking():
    browser = None
    results = []

    # Read dynamic command line arguments from your Express spawn engine
    # Default to 'New York' if none passed manually via CLI
    destination = sys.argv[1] if len(sys.argv) > 1 else "New York"
    checkin = sys.argv[2] if len(sys.argv) > 2 else ""
    checkout = sys.argv[3] if len(sys.argv) > 3 else ""

    encoded_query = urllib.parse.quote(destination)
    
    # Build a production search URL passing dates if present
    url = f"https://www.booking.com/searchresults.html?ss={encoded_query}&lang=en-us&sb=1"
    if checkin and checkout:
        url += f"&checkin={checkin}&checkout={checkout}"

    try:
        async with async_playwright() as p:
            # Headless can be True in production to improve speed overhead
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={'width': 1280, 'height': 800}
            )
            
            await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            page = await context.new_page()

            response = await page.goto(url, wait_until="domcontentloaded", timeout=60000)

            # Settle page scripts
            await asyncio.sleep(2)

            # Handle Cookie Popups structurally
            try:
                await page.click('#onetrust-accept-btn-handler', timeout=3000)
            except Exception:
                pass

            # Wait for elements
            try:
                await page.wait_for_selector('[data-testid="property-card"]', timeout=10000)
            except Exception:
                # Print clean json error fallback instead of breaking the node pipeline stdout reader
                print(json.dumps({"error": f"No property cards found on page for destination: {destination}"}))
                return

            # Trigger lazy structures
            await page.mouse.wheel(0, 2000)
            await asyncio.sleep(1)

            html_content = await page.content()
            soup = BeautifulSoup(html_content, "html.parser")
            cards = soup.select('[data-testid="property-card"]')[:10]

            for card in cards:
                try:
                    name_el = card.select_one('[data-testid="title"]')
                    link_el = card.select_one('[data-testid="title-link"]')
                    rating_el = card.select_one('[data-testid="review-score"]')
                    price_el = card.select_one('[data-testid="price-and-discounted-price"]')
                    img_el = card.select_one('[data-testid="image"]') or card.select_one('img')
                    location_el = card.select_one('[data-testid="address"]')

                    # Reconstruct links perfectly
                    hotel_url = link_el.get('href') if link_el else ""
                    if hotel_url and hotel_url.startswith('/'):
                        hotel_url = f"https://www.booking.com{hotel_url}"
                    # Strip tracking parameters from clean URLs
                    if hotel_url:
                        hotel_url = hotel_url.split('?')[0]

                    hotel_name = name_el.get_text(strip=True) if name_el else "N/A"
                    
                    hotel_rating = "0.0"
                    if rating_el:
                        raw_rating = rating_el.get_text(strip=True)
                        # Filter standard values (e.g. "Scored 8.5")
                        extracted_digits = [s for s in raw_rating.split() if s.replace('.', '', 1).isdigit()]
                        if extracted_digits:
                            hotel_rating = extracted_digits[0]
                        elif "Scored" in raw_rating:
                            hotel_rating = raw_rating.replace("Scored", "").strip()

                    price_text = price_el.get_text(strip=True) if price_el else "Price: Not disclosed"
                    image_url = img_el.get('src') if img_el else ""

                    # 🟢 SYNCED LAYOUT STRUCTURE MATCHING CONTROLLER RECORDS
                    results.append({
                        "title": hotel_name,
                        "hotelUrl": hotel_url,
                        "location": location_el.get_text(strip=True) if location_el else destination,
                        "priceText": price_text,
                        "rating": hotel_rating,
                        "imageUrl": image_url
                    })
                except Exception:
                    continue

            # CRITICAL FOR SPAWN PIPELINES: Output NOTHING to stdout but the clean raw valid JSON array
            print(json.dumps(results))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
    finally:
        if browser:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_booking())