import asyncio
import os
import re
import sys
import json
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup   # pip install beautifulsoup4
from dotenv import load_dotenv  # type: ignore

load_dotenv()

def parse_amazon_html(html, search_term):
    soup = BeautifulSoup(html, "html.parser")
    results = []
    items = soup.select('[data-component-type="s-search-result"]')

    for el in items:
        title_recipe = el.select_one('[data-cy="title-recipe"]')
        rating_el = el.select_one('i.a-icon-star-mini .a-icon-alt') or el.select_one('i.a-icon-star .a-icon-alt')
        rating_text = rating_el.get_text(strip=True) if rating_el else ""
        price_el = el.select_one('.a-price .a-offscreen')
        price_text = price_el.get_text(strip=True) if price_el else ""

        title = "Unknown Title"
        authors = []
        url = None

        if title_recipe:
            h2 = title_recipe.find("h2")
            if h2:
                title = h2.get_text(strip=True)

            authors = [
                a.get_text(strip=True)
                for a in title_recipe.select('.a-row.a-size-base.a-color-secondary a')
                if a.get_text(strip=True)
            ]

            link = title_recipe.find("a")
            if link:
                url = link.get("href")

        try:
            price = float(re.sub(r"[^\d.]", "", price_text)) if price_text else None
        except ValueError:
            price = None
            
        try:
            rating = float(rating_text.split(" ")[0]) if rating_text else None
        except (ValueError, IndexError):
            rating = None

        reviews = 0
        reviews_el = el.select_one('a[aria-label*="ratings"]')
        if reviews_el and reviews_el.has_attr("aria-label"):
            reviews_str = re.sub(r"\D", "", reviews_el["aria-label"])
            reviews = int(reviews_str) if reviews_str else 0

        image_el = el.select_one("img.s-image")
        image = image_el.get("src") if image_el else None

        # Build absolute URL mapping for clean delivery
        product_url = f"https://www.amazon.com{url}" if url else ""

        results.append({
            "title": title,
            "authors": authors,
            "productUrl": product_url,
            "price": price,
            "rating": rating,
            "reviewsCount": reviews,
            "imageUrl": image
        })

    return results

async def fetch_amazon_books_stealth(query):
    base_url = "https://www.amazon.com"
    page_url = f"{base_url}/s?k={query}&i=stripbooks"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--window-position=0,0"
            ]
        )
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 800},
            locale="en-US",
            timezone_id="America/New_York"
        )
        
        page = await context.new_page()

        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
        """)

        try:
            await page.goto(page_url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(3) # Short hummanized load pause
            
            html_text = await page.content()
            
            if "Something went wrong" in html_text or "api-services-support@amazon.com" in html_text:
                raise Exception("Amazon CAPTCHA or blocking wall encountered.")

            return parse_amazon_html(html_text, query)

        finally:
            await browser.close()

async def main():
    # ⚡️ AGENT CONTEXT ROUTING: Read dynamic values passed from Node.js child_process
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing target search query argument"}))
        sys.exit(1)

    query_param = sys.argv[1]
    
    try:
        results = await fetch_amazon_books_stealth(query_param)
        # ⚡️ PURE COMMUNICATION CHANNEL: Output ONLY clean stringified JSON array
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())