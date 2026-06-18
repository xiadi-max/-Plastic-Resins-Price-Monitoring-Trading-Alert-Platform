#!/usr/bin/env python3
import sys
import json
import time
import subprocess

def install_if_needed(package):
    try:
        __import__(package)
    except ImportError:
        print(f"Installing {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package, "-q"])

install_if_needed("selenium")
install_if_needed("webdriver_manager")

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

class StealthScraper:
    def __init__(self):
        self.options = Options()
        self.options.add_argument('--headless')
        self.options.add_argument('--no-sandbox')
        self.options.add_argument('--disable-dev-shm-usage')
        self.options.add_argument('--disable-blink-features=AutomationControlled')
        self.options.add_argument('--disable-web-security')
        self.options.add_argument('--disable-features=IsolateOrigins,site-per-process')
        self.options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        
        # Disable automation flags
        self.options.add_experimental_option("excludeSwitches", ["enable-automation"])
        self.options.add_experimental_option('useAutomationExtension', False)
    
    def scrape(self, url):
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=self.options)
        
        try:
            # Remove webdriver property
            driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                'source': '''
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    })
                '''
            })
            
            print(f"Loading: {url}")
            driver.get(url)
            
            # Wait for table
            wait = WebDriverWait(driver, 30)
            table = wait.until(EC.presence_of_element_located((By.TAG_NAME, "table")))
            
            # Wait for data to load
            time.sleep(3)
            
            # Get headers
            headers = [th.text.strip() for th in table.find_elements(By.CSS_SELECTOR, "thead th")]
            print(f"Headers: {headers}", file=sys.stderr)
            
            # Get rows
            products = []
            rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
            print(f"Found {len(rows)} rows", file=sys.stderr)
            
            for row in rows[:20]:  # Limit to 20 for testing
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) >= 8:
                    try:
                        product = {
                            "product_name": cells[0].text.strip(),
                            "manufacturer": cells[1].text.strip(),
                            "model": cells[2].text.strip(),
                            "current_price": self._parse_price(cells[7].text.strip())
                        }
                        products.append(product)
                        print(f"Scraped: {product['product_name']} {product['model']}", file=sys.stderr)
                    except Exception as e:
                        print(f"Error parsing row: {e}", file=sys.stderr)
            
            return products
            
        finally:
            driver.quit()
    
    def _parse_price(self, price_text):
        try:
            # Extract number from text like "19400 元/吨"
            import re
            match = re.search(r'(\d+)', price_text.replace(',', ''))
            return int(match.group(1)) if match else 0
        except:
            return 0

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python stealth_scrape.py <url>", file=sys.stderr)
        sys.exit(1)
    
    url = sys.argv[1]
    scraper = StealthScraper()
    products = scraper.scrape(url)
    
    print(json.dumps({"products": products}, ensure_ascii=False, indent=2))
