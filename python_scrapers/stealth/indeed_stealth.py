import asyncio
import os
import sys
import json
import urllib.parse as urlparse
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

def parse_indeed_html(html):
    soup = BeautifulSoup(html, "html.parser")
    results = []

    job_cards = soup.select('.job_seen_beacon')

    for card in job_cards:
        # ── 1. Title ──────────────────────────────────────────────────────────
        # Indeed now uses <h3 class="jobTitle"> not h2
        title = None
        for sel in [
            'h3.jobTitle a span[title]',       # span with title attribute
            'h3.jobTitle a span[id^="jobTitle"]', # span with id="jobTitle-{jk}"
            'h3.jobTitle a span',              # any span inside anchor
            'h3.jobTitle a',                   # anchor aria-label fallback
            'h3.jobTitle',
        ]:
            el = card.select_one(sel)
            if el:
                text = (
                    el.get('title') or
                    el.get('aria-label') or
                    el.get_text(strip=True)
                )
                if text and text.strip():
                    title = text.strip()
                    break

        title = title or "Job Opportunity"

        # ── 2. Job URL ────────────────────────────────────────────────────────
        jk_id = card.get('data-jk')

        if not jk_id:
            anchor = card.select_one('h3.jobTitle a')
            if anchor:
                jk_id = anchor.get('data-jk')
                if not jk_id:
                    href = anchor.get('href', '')
                    parsed = urlparse.urlparse(href)
                    params = urlparse.parse_qs(parsed.query)
                    jk_id = params.get('jk', [None])[0]

        if not jk_id:
            any_anchor = card.select_one('a[data-jk]')
            if any_anchor:
                jk_id = any_anchor.get('data-jk')

        if not jk_id:
            for a in card.select('a[href*="jk="]'):
                href = a.get('href', '')
                parsed = urlparse.urlparse(href)
                params = urlparse.parse_qs(parsed.query)
                jk_id = params.get('jk', [None])[0]
                if jk_id:
                    break

        job_url = f"https://www.indeed.com/viewjob?jk={jk_id}" if jk_id else "https://www.indeed.com"

        # ── 3. Company ────────────────────────────────────────────────────────
        company_el = card.select_one('[data-testid="company-name"]')
        company = company_el.get_text(strip=True) if company_el else "Company Confidential"

        # ── 4. Location ───────────────────────────────────────────────────────
        location_el = card.select_one('[data-testid="text-location"]')
        location = location_el.get_text(strip=True) if location_el else "Remote / Unspecified"

        # ── 5. Salary ─────────────────────────────────────────────────────────
        # Indeed often omits salary on search cards entirely.
        # We try every known selector; if nothing is present the listing
        # genuinely has no salary shown — "Not Disclosed" is correct.
        salary_el = (
            card.select_one('[data-testid="attribute_snippet_testid"]') or
            card.select_one('[data-testid="jobsearch-SerpJobCard-salary"]') or
            card.select_one('.salary-snippet-container') or
            card.select_one('.estimated-salary-container') or
            card.select_one('.metadata.salarySnippetContainer') or
            card.select_one('[class*="salary"]')
        )
        salary_text = salary_el.get_text(strip=True) if salary_el else "Not Disclosed"

        # ── 6. Benefits (bonus metadata) ──────────────────────────────────────
        # Collect benefit chips like "401(k)", "Health insurance" etc.
        benefit_spans = card.select('.metadataContainer span.css-zydy3i')
        benefits = [s.get_text(strip=True) for s in benefit_spans if s.get_text(strip=True)]

        results.append({
            "title": title,
            "company": company,
            "location": location,
            "salaryText": salary_text,
            "benefits": benefits,
            "jobUrl": job_url
        })

    return results


async def fetch_indeed_jobs_stealth(role, location):
    encoded_role = role.replace(" ", "+")
    encoded_loc  = location.replace(" ", "+")
    page_url = f"https://www.indeed.com/jobs?q={encoded_role}&l={encoded_loc}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars"
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 850},
            locale="en-US"
        )
        page = await context.new_page()
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });")

        try:
            await page.goto(page_url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(5)

            html_text = await page.content()
            if "hCaptcha" in html_text or "Checking if the site connection is secure" in html_text:
                raise Exception("Indeed Cloudflare anti-bot security block triggered.")

            return parse_indeed_html(html_text)
        finally:
            await browser.close()


async def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing target positional arguments: [role] [location]"}))
        sys.exit(1)

    role_param = sys.argv[1]
    location_param = sys.argv[2]

    try:
        results = await fetch_indeed_jobs_stealth(role_param, location_param)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())