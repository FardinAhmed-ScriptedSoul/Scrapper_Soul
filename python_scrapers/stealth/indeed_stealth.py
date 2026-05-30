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
    
    # Target standard card containers
    job_cards = soup.select('.job_seen_beacon')

    for card in job_cards:
        # 1. Title Extraction
        title_el = card.select_one('h2.jobTitle span[id^="job-"]') or card.select_one('h2.jobTitle a')
        title = title_el.get_text(strip=True) if title_el else "Job Opportunity"
        
        # 2. Extract Job Token ID and safely format URL
        anchor = card.select_one('h2.jobTitle a')
        jk_id = None
        if anchor:
            jk_id = anchor.get('data-jk')
            if not jk_id and 'href' in anchor.attrs:
                parsed_url = urlparse.urlparse(anchor['href'])
                query_params = urlparse.parse_qs(parsed_url.query)
                jk_id = query_params.get('jk', [None])[0]

        # Ensure jobUrl is NEVER empty to safely pass schema validation
        job_url = f"https://www.indeed.com/viewjob?jk={jk_id}" if jk_id else "https://www.indeed.com"

        # 3. Extract Company Name
        company_el = card.select_one('[data-testid="company-name"]')
        company = company_el.get_text(strip=True) if company_el else "Company Confidential"

        # 4. Extract Location
        location_el = card.select_one('[data-testid="text-location"]')
        location = location_el.get_text(strip=True) if location_el else "Remote / Unspecified"

        # 5. Extract Salary
        salary_el = card.select_one('.salary-snippet-container') or card.select_one('.estimated-salary-container') or card.select_one('.metadata.salarySnippetContainer')
        salary_text = salary_el.get_text(strip=True) if salary_el else "Not Disclosed"

        results.append({
            "title": title,
            "company": company,
            "location": location,
            "salaryText": salary_text,
            "jobUrl": job_url
        })

    return results

async def fetch_indeed_jobs_stealth(role, location):
    encoded_role = role.replace(" ", "+")
    encoded_loc = location.replace(" ", "+")
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