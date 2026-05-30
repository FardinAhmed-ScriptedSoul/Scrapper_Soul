import asyncio
import os
import re
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup   # pip install beautifulsoup4
from dotenv import load_dotenv  # type: ignore

load_dotenv()

def print_results(results, limit=10):
    print("\n" + "=" * 60)
    print(f" Stealth Matrix: Found {len(results)} results")
    print("=" * 60)

    for i, item in enumerate(results[:limit], start=1):
        print(f"\n[{i}] {item['title']}")
        print("-" * 60)

        if item["authors"]:
            print("👤 Authors :", ", ".join(item["authors"]))

        print(f"💰 Price   : ${item['price']:.2f}" if item["price"] else "💰 Price   : N/A")
        print("⭐ Rating  :", item["rating"] if item["rating"] else "N/A")
        print("📝 Reviews :", item["reviews"])

        if item["url"]:
            print("🔗 URL     :", f"https://www.amazon.com{item['url']}")

        if item["image"]:
            print("🖼️ Image  :", item["image"])

    print("\n" + "=" * 60)

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

        results.append({
            "searchTerm": search_term,
            "title": title,
            "authors": authors,
            "url": url,
            "price": price,
            "rating": rating,
            "reviews": reviews,
            "image": image
        })

    return results

async def fetch_amazon_books_stealth(query):
    base_url = os.getenv("BASE_URL_AMAZON") or "https://www.amazon.com"
    page_url = f"{base_url}/s?k={query}&i=stripbooks"
    
    print(f"🌐 Navigating in Local Stealth Mode to: {page_url}")

    async with async_playwright() as p:
        # Launch with advanced engine arguments to hide automation hooks
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled", # Hides navigator.webdriver=true
                "--disable-infobars",                            # Prevents "Chrome is controlled by automated software" bar
                "--window-position=0,0"
            ]
        )
        
        # Build an authentic human context structure
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 800},
            locale="en-US",
            timezone_id="America/New_York"
        )
        
        page = await context.new_page()

        # JavaScript injection script to patch and ensure window.chrome runtime integrity
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
        """)

        try:
            response = await page.goto(page_url, wait_until="domcontentloaded", timeout=60000)
            status = response.status if response else "No Response"
            print(f"HTTP Status: {status}")

            # Natural dynamic pacing pause
            await asyncio.sleep(4)
            
            html_text = await page.content()
            
            if "Something went wrong" in html_text or "api-services-support@amazon.com" in html_text:
                raise Exception("Amazon CAPTCHA or blocking wall encountered.")

            return parse_amazon_html(html_text, query)

        finally:
            await browser.close()
            print("🔒 Stealth Browser safely closed.")

async def main():
    try:
        query = "python"
        results = await fetch_amazon_books_stealth(query)
        print_results(results)

    except Exception as error:
        print("❌ Error fetching books:", str(error))

if __name__ == "__main__":
    asyncio.run(main())