import os
from playwright.sync_api import sync_playwright

def verify_cybersentry():
    os.makedirs('verification', exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set a standard desktop viewport size
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        print("Navigating to local CyberSentry client...")
        page.goto("http://localhost:5173/")

        # Expect/wait for the disclaimer modal terms checkbox
        print("Checking disclaimer terms checkbox...")
        page.locator("#terms").click()

        print("Accepting terms...")
        page.get_by_role("button", name="Войти в панель CyberSentry").click()

        print("Waiting for main Dashboard view to load...")
        # Wait for the StatusWidget to be visible
        page.locator("text=Статус: Ваша цифровая безопасность под контролем").wait_for(state="visible", timeout=10000)

        # Let's type a phone number and see the search button state / card state
        print("Typing a phone number...")
        page.get_by_placeholder("+7 (999) 000-00-00").fill("+79001234567")

        # Take a screenshot
        screenshot_path = "verification/verification.png"
        print(f"Taking screenshot and saving to {screenshot_path}...")
        page.screenshot(path=screenshot_path)

        # Let's click checking button to see results
        print("Clicking search/check button...")
        page.get_by_role("button", name="Проверить").click()

        # Wait for result card to show
        page.locator("text=Мошенники: Банковский фишинг").wait_for(state="visible", timeout=10000)

        # Take an updated screenshot of the checked result
        screenshot_checked_path = "verification/verification_checked.png"
        print(f"Taking screenshot of result card and saving to {screenshot_checked_path}...")
        page.screenshot(path=screenshot_checked_path)

        browser.close()
        print("Verification complete!")

if __name__ == "__main__":
    verify_cybersentry()
