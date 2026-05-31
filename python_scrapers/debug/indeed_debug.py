"""
Run this INSTEAD of indeed_stealth.py to dump the raw HTML of the first job card.
Usage: python indeed_debug_dump.py "ML Engineer" "onsite"
It will print the card HTML so you can see the real selectors Indeed is using.
"""
import asyncio
import sys
import json
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import urllib.parse as urlparse

async def debug_dump(role, location):
    encoded_role = role.replace(" ", "+")
    encoded_loc  = location.replace(" ", "+")
    page_url = f"https://www.indeed.com/jobs?q={encoded_role}&l={encoded_loc}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled", "--disable-infobars"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 850},
            locale="en-US"
        )
        page = await context.new_page()
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

        await page.goto(page_url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(5)

        html_text = await page.content()
        await browser.close()

    soup = BeautifulSoup(html_text, "html.parser")
    cards = soup.select('.job_seen_beacon')

    print(f"\n✅ Found {len(cards)} job cards\n")
    print("=" * 80)

    if not cards:
        # Dump a snippet of the full page to see what's there
        print("⚠️  No .job_seen_beacon cards found. Page snippet:")
        print(html_text[:3000])
        return

    # Dump first 2 cards in full so you can read the real structure
    for i, card in enumerate(cards[:2]):
        print(f"\n{'='*80}")
        print(f"CARD #{i+1} RAW HTML:")
        print('='*80)
        print(card.prettify())

        print(f"\n--- CARD #{i+1} QUICK PROBE ---")

        # h2 title block
        h2 = card.select_one('h2.jobTitle')
        print(f"h2.jobTitle exists     : {h2 is not None}")
        if h2:
            print(f"h2 full text           : {h2.get_text(strip=True)!r}")
            print(f"h2 inner HTML snippet  : {str(h2)[:400]}")

        # All spans inside h2
        if h2:
            for idx, sp in enumerate(h2.select('span')):
                print(f"  span[{idx}] text={sp.get_text(strip=True)!r}  title-attr={sp.get('title')!r}  aria-label={sp.get('aria-label')!r}  id={sp.get('id')!r}")

        # All anchors inside h2
        if h2:
            for idx, a in enumerate(h2.select('a')):
                print(f"  a[{idx}] text={a.get_text(strip=True)!r}  data-jk={a.get('data-jk')!r}  href={a.get('href','')[:80]!r}")

        # Salary probes
        print(f"\nSalary probe results:")
        salary_selectors = [
            '[data-testid="attribute_snippet_testid"]',
            '[data-testid="jobsearch-SerpJobCard-salary"]',
            '.salary-snippet-container',
            '.estimated-salary-container',
            '.metadata.salarySnippetContainer',
            '[class*="salary"]',
            '[class*="Salary"]',
            '[data-testid*="salary"]',
            '[data-testid*="Salary"]',
        ]
        for sel in salary_selectors:
            el = card.select_one(sel)
            if el:
                print(f"  ✅ FOUND [{sel}] => {el.get_text(strip=True)!r}")
            else:
                print(f"  ❌ miss  [{sel}]")

        # Dump all data-testid attributes in this card
        print(f"\nAll data-testid values in card #{i+1}:")
        for el in card.select('[data-testid]'):
            print(f"  data-testid={el.get('data-testid')!r}  tag={el.name}  text={el.get_text(strip=True)[:60]!r}")

    print("\n" + "="*80)
    print("DONE — paste the output above to identify the real selectors.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python indeed_debug_dump.py <role> <location>")
        sys.exit(1)
    asyncio.run(debug_dump(sys.argv[1], sys.argv[2]))