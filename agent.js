import { chromium } from "playwright";

/**
 * Dynamic Automation Script for Tanta University Voting
 * Usage: node agent.js [ID] [ChoiceIndex]
 * Example: node agent.js urID 1  (1 is option 'b', 0 is 'a')
 */

const TARGET_ID = process.argv[2];
const CHOICE_INDEX = parseInt(process.argv[3]) || 1; // Default to 'b' (index 1)

(async () => {
    console.log(`Starting dynamic voting for ID: ${TARGET_ID} with Choice Index: ${CHOICE_INDEX}`);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // 1. Go to the registration page
        console.log("Navigating to registration page...");
        await page.goto("https://tdb.tanta.edu.eg/reg_eng_credit", {
            waitUntil: "networkidle",
        });

        // 2. Select User Type "طالب/طالبه"
        console.log("Selecting user type 'طالب/طالبه'...");
        const userTypeSelect = page.locator('select').first();
        if (await userTypeSelect.count() > 0) {
            const options = await userTypeSelect.locator('option').allTextContents();
            const targetOption = options.find(text => text.includes('طالب'));
            if (targetOption) {
                await userTypeSelect.selectOption({ label: targetOption.trim() });
            } else {
                await userTypeSelect.selectOption({ index: 1 }).catch(() => { });
            }
        }

        // 3. Enter the ID
        console.log(`Entering ID: ${TARGET_ID}...`);
        const idInput = page.locator('input[type="text"]').first();
        await idInput.fill(TARGET_ID);

        // 4. Click دخول (Login/Enter)
        console.log("Clicking دخول...");
        const loginButton = page.locator('input[type="submit"], button').filter({ hasText: /دخول/ });
        await loginButton.first().click();

        // 5. Navigate to the voting page
        console.log("Navigating to voting page...");
        await page.waitForTimeout(2000);
        await page.goto("https://tdb.tanta.edu.eg/reg_eng_credit/voting_data.aspx", {
            waitUntil: "networkidle",
        });

        // Dynamic Loop: Continue as long as there are voting items
        let iteration = 1;
        while (true) {
            console.log(`--- Iteration ${iteration} ---`);

            // Check if there are radio buttons (questions)
            const radioGroups = await page.locator('input[type="radio"]').evaluateAll((els) => {
                const names = new Set(els.map(el => el.name));
                return Array.from(names);
            });

            if (radioGroups.length === 0) {
                console.log("No more voting items found. Finishing...");
                break;
            }

            console.log(`Voting on ${radioGroups.length} questions...`);

            // Select the choice for each group
            for (const name of radioGroups) {
                const radios = page.locator(`input[name="${name}"]`);
                const count = await radios.count();
                if (count > CHOICE_INDEX) {
                    await radios.nth(CHOICE_INDEX).check();
                } else if (count > 0) {
                    await radios.last().check(); // Fallback to last available
                }
            }

            // Click the save button (حفظ)
            console.log("Clicking save (حفظ)...");
            const saveButton = page.locator('input[type="submit"], button').filter({ hasText: /حفظ/ });

            const navigationPromise = page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => { });

            if (await saveButton.count() > 0) {
                await saveButton.first().click();
            } else {
                const fallbackSave = page.locator('input[id*="Submit"], input[id*="Save"], input[id*="btnSave"]').first();
                if (await fallbackSave.count() > 0) {
                    await fallbackSave.click();
                }
            }

            await navigationPromise;
            await page.waitForTimeout(2000);

            // If we are kicked off the voting page, try to come back
            if (!page.url().includes('voting_data.aspx')) {
                console.log("Redirected. Checking if more items exist...");
                const response = await page.goto("https://tdb.tanta.edu.eg/reg_eng_credit/voting_data.aspx", {
                    waitUntil: "networkidle",
                }).catch(() => null);

                // If the redirect stays or fails, we might be done
                if (!response || !page.url().includes('voting_data.aspx')) {
                    console.log("Could not return to voting page. Process might be complete.");
                    break;
                }
            }

            iteration++;
            if (iteration > 50) { // Safety break
                console.log("Maximum iterations reached. Stopping safety break.");
                break;
            }
        }

        console.log("Dynamic process completed successfully.");
    } catch (error) {
        console.error("An error occurred during the automation:", error);
    } finally {
        console.log("Browser is paused for your review. Close the browser window when done.");
        await page.pause();
        await browser.close();
    }
})();
