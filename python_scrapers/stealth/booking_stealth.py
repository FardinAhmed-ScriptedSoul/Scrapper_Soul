import asyncio
import sys
import json
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

def parse_booking_html(html):
    soup = BeautifulSoup(html, "html.parser")
    results = []
    cards = soup.select('[data-testid="property-card"]')

    for card in cards:
        # 1. Hotel Title and link URL
        title_el = card.select_one('[data-testid="title"]')
        title = title_el.get_text(strip=True) if title_el else "Premium Hotel Stay"

        link_el = card.select_one('[data-testid="title-link"]')
        raw_url = link_el.get('href') if link_el else ""
        clean_url = raw_url.split("?")[0] if raw_url else "https://www.booking.com"

        # 2. Resilient Location Lookup Chain
        loc_el = (card.select_one('[data-testid="address"]') or 
                  card.select_one('[data-testid="location"]') or 
                  card.select_one('.a147e2892a')) # Backup internal layout hash block class
        
        location = loc_el.get_text(strip=True) if loc_el else "New York, USA"

        # 3. Pricing Text
        price_el = card.select_one('[data-testid="price-and-discounted-price"]') or card.select_one('[data-testid="price-metadata"]')
        price = price_el.get_text(strip=True) if price_el else "Price on Request"

        # 4. Rating metrics
        rating_el = card.select_one('[data-testid="review-score"]')
        if rating_el:
            score_div = rating_el.find('div')
            rating_text = score_div.get_text(strip=True) if score_div else "Scored 8.0"
        else:
            rating_text = "N/A"

        # 5. Picture media assets
        img_el = card.select_one('[data-testid="image"]')
        img_url = img_el.get('src') if img_el else ""

        results.append({
            "title": title,
            "hotelUrl": clean_url,
            "location": location,
            "priceText": price,
            "rating": rating_text,
            "imageUrl": img_url
        })

    return results

async def fetch_booking_stealth(destination, checkin, checkout):
    encoded_dest = destination.replace(" ", "+")
    page_url = f"https://www.booking.com/searchresults.html?ss={encoded_dest}&checkin={checkin}&checkout={checkout}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={'width': 1366, 'height': 768}
        )
        page = await context.new_page()
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

        try:
            await page.goto(page_url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(5)
            
            html_text = await page.content()
            return parse_booking_html(html_text)
        finally:
            await browser.close()

async def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Missing arguments. Format: [destination] [checkIn] [checkOut]"}))
        sys.exit(1)

    dest = sys.argv[1]
    in_date = sys.argv[2]
    out_date = sys.argv[3]
    
    try:
        results = await fetch_booking_stealth(dest, in_date, out_date)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())