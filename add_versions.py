import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

def extract_versions(driver):
    """Extract version data from the current page"""
    try:
        print("   📋 Extracting versions...")
        time.sleep(2)
        
        # Find and click menu button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        menu_btn = None
        
        # Try to find menu button with more-vertical icon
        for btn in buttons:
            if "more-vertical" in btn.get_attribute("innerHTML"):
                menu_btn = btn
                break
        
        # Try last 15 buttons if not found
        if not menu_btn:
            for btn in buttons[-15:]:
                try:
                    if btn.find_element(By.TAG_NAME, "svg"):
                        btn.click()
                        time.sleep(1.5)
                        
                        # Check if menu appeared
                        try:
                            driver.find_element(By.CSS_SELECTOR, '[role="menu"]')
                            menu_btn = btn
                            print("   ✅ Found menu button")
                            break
                        except:
                            # Close any popup
                            driver.find_element(By.TAG_NAME, "body").click()
                            time.sleep(0.5)
                except:
                    continue
        else:
            menu_btn.click()
            time.sleep(1.5)
        
        if not menu_btn:
            print("   ❌ Menu button not found")
            return []
        
        # Find Versions menu item
        try:
            versions_btn = driver.find_element(By.CSS_SELECTOR, '[data-test-id="Versions"]')
        except:
            # Try finding by text
            menu_items = driver.find_elements(By.CSS_SELECTOR, '[role="menuitem"]')
            versions_btn = None
            for item in menu_items:
                if "Version" in item.text:
                    versions_btn = item
                    break
        
        if not versions_btn:
            print("   ❌ Versions menu item not found")
            driver.find_element(By.TAG_NAME, "body").click()
            return []
        
        print("   ✅ Clicking Versions...")
        versions_btn.click()
        time.sleep(3)
        
        # Wait for dialog
        try:
            dialog = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[role="dialog"]'))
            )
        except TimeoutException:
            print("   ❌ Dialog did not open")
            return []
        
        print("   ✅ Dialog opened")
        
        versions = []
        
        # Get draft
        try:
            draft = dialog.find_element(By.CSS_SELECTOR, '[data-test-id="draft-item"]')
            draft_text = draft.text
            
            # Extract date
            import re
            date_match = re.search(r'Last saved (.+)', draft_text)
            
            versions.append({
                "name": "Draft",
                "publishedDate": date_match.group(1).strip() if date_match else None,
                "author": None,
                "isLive": False
            })
            print("   Found draft")
        except NoSuchElementException:
            pass
        
        # Get published versions
        version_items = dialog.find_elements(By.CSS_SELECTOR, '[data-test-id="version-item"]')
        print(f"   Found {len(version_items)} published versions")
        
        for item in version_items:
            text = item.text
            
            # Extract version name
            name_match = re.search(r'Version \d+', text)
            
            # Extract published date
            date_match = re.search(r'Published (.+?)(?:Live|[A-Z])', text)
            
            # Extract author (last two words)
            words = text.strip().split()
            author = f"{words[-2]} {words[-1]}" if len(words) >= 2 else None
            
            # Check if Live
            is_live = "Live" in text
            
            if name_match:
                versions.append({
                    "name": name_match.group(0),
                    "publishedDate": date_match.group(1).strip() if date_match else None,
                    "author": author,
                    "isLive": is_live
                })
        
        # Close dialog
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.5)
        
        print(f"   ✅ Extracted {len(versions)} versions")
        return versions
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return []

def main():
    # Load JSON file
    print("📂 Loading JSON file...")
    with open('./navattic-demos/navattic_demos_845_items_1771354575002.json', 'r') as f:
        data = json.load(f)
    
    print(f"✅ Loaded {len(data)} demos\n")
    
    # Setup Chrome driver
    print("🌐 Starting Chrome...")
    options = webdriver.ChromeOptions()
    # Remove headless mode so you can see what's happening
    # options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    try:
        # Process each demo
        for i, demo in enumerate(data):
            print(f"\n[{i + 1}/{len(data)}] Processing: {demo['title']}")
            
            # Skip if already has versions
            if demo.get('versions') and len(demo['versions']) > 0:
                print("   ⏭️  Already has versions, skipping")
                continue
            
            # Navigate to build URL
            print(f"   🔗 Navigating to: {demo['buildUrl']}")
            driver.get(demo['buildUrl'])
            time.sleep(2)
            
            # Extract versions
            versions = extract_versions(driver)
            
            # Update demo
            demo['versions'] = versions
            demo['versionsScrapedAt'] = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
            
            # Save progress every 10 demos
            if (i + 1) % 10 == 0:
                print(f"\n💾 Saving progress ({i + 1} demos processed)...")
                with open('./navattic-demos/navattic_demos_with_versions_progress.json', 'w') as f:
                    json.dump(data, f, indent=2)
        
        # Save final result
        print("\n\n🎉 All done! Saving final result...")
        output_file = './navattic-demos/navattic_demos_complete_with_versions.json'
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"✅ Saved to: {output_file}")
        
        # Show statistics
        with_versions = sum(1 for d in data if d.get('versions') and len(d['versions']) > 0)
        print(f"\n📊 Statistics:")
        print(f"   Total demos: {len(data)}")
        print(f"   With versions: {with_versions}")
        print(f"   Without versions: {len(data) - with_versions}")
        
    finally:
        driver.quit()
        print("\n👋 Browser closed")

if __name__ == "__main__":
    main()

