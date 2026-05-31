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

    destination = sys.argv[1] if len(sys.argv) > 1 else "New York"
    checkin = sys.argv[2] if len(sys.argv) > 2 else ""
    checkout = sys.argv[3] if len(sys.argv) > 3 else ""

    encoded_query = urllib.parse.quote(destination)
    url = f"https://www.booking.com/searchresults.html?ss={encoded_query}&lang=en-us&sb=1"
    if checkin and checkout:
        url += f"&checkin={checkin}&checkout={checkout}"

    try:
        async with async_playwright() as p:
            # 💡 CHANGED TO headless=False SO YOU CAN VISUALLY SEE THE WINDOW LAUNCH
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                viewport={'width': 1280, 'height': 800}
            )
            await context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            page = await context.new_page()

            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(3)

            try:
                await page.click('#onetrust-accept-btn-handler', timeout=3000)
            except Exception:
                pass

            # 💡 FIX: Return empty array natively when Booking targets miss or throw a verification captcha
            try:
                await page.wait_for_selector('[data-testid="property-card"]', timeout=12000)
            except Exception:
                print(json.dumps([]))
                return

            await page.mouse.wheel(0, 2000)
            await asyncio.sleep(2)

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

                    raw_url = link_el.get('href', '') if link_el else ""
                    hotel_url = ""
                    
                    if raw_url:
                        clean_path = raw_url.split('?')[0]
                        if clean_path.startswith('/'):
                            hotel_url = f"https://www.booking.com{clean_path}"
                        else:
                            hotel_url = clean_path

                    hotel_name = name_el.get_text(strip=True) if name_el else "N/A"
                    
                    hotel_rating = "0.0"
                    if rating_el:
                        raw_rating = rating_el.get_text(strip=True)
                        extracted_digits = [s for s in raw_rating.split() if s.replace('.', '', 1).isdigit()]
                        if extracted_digits:
                            hotel_rating = extracted_digits[0]
                        elif "Scored" in raw_rating:
                            hotel_rating = raw_rating.replace("Scored", "").strip()

                    price_text = price_el.get_text(strip=True) if price_el else "Price: Not disclosed"
                    image_url = img_el.get('src') if img_el else ""

                    results.append({
                        "title": hotel_name,
                        "url": hotel_url,
                        "location": location_el.get_text(strip=True) if location_el else destination,
                        "priceText": price_text,
                        "rating": hotel_rating,
                        "imageUrl": image_url
                    })
                except Exception:
                    continue

            print(json.dumps(results))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
    finally:
        if browser:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_booking())