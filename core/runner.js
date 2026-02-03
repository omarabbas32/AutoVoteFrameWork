import { chromium } from "playwright";

/**
 * Core Runner for AutoVote - Generic Version
 * @param {Object} options - { id, choiceIndex, loginUrl, voteUrl, maxIterations, logger }
 */
export async function runVote({ id, choiceIndex, loginUrl, voteUrl, maxIterations = 1, logger = console.log }) {
    logger(`Starting automation for [${id}]`);
    logger(`Login URL: ${loginUrl}`);
    logger(`Voting URL: ${voteUrl}`);
    logger(`Choice Index: ${choiceIndex} | Max Iterations: ${maxIterations}`);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // 1. Navigate to login
        logger("Navigating to login page...");
        await page.goto(loginUrl, { waitUntil: "networkidle" });

        // 2. Select User Type/Role (Site specific logic might be needed here)
        // For now, we keep the Tanta dropdown logic as a default or until more site types are added
        logger("Attempting to identify user type selection...");
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

        // 3. Identification
        logger(`Entering ID...`);
        const idInput = page.locator('input[type="text"], input[name*="id"]').first();
        await idInput.fill(id);

        // 4. Submit Login
        logger("Submitting login...");
        const loginButton = page.locator('input[type="submit"], button').filter({ hasText: /دخول|Login|Sign In/i });
        if (await loginButton.count() > 0) {
            await loginButton.first().click();
        } else {
            await page.keyboard.press("Enter");
        }

        // 5. Navigate to voting page
        logger("Waiting for navigation to voting area...");
        await page.waitForTimeout(2000);
        await page.goto(voteUrl, { waitUntil: "networkidle" });

        // 6. Voting Loop
        for (let iteration = 1; iteration <= maxIterations; iteration++) {
            logger(`--- Iteration ${iteration} of ${maxIterations} ---`);

            const radioGroups = await page.locator('input[type="radio"]').evaluateAll((els) => {
                const names = new Set(els.map(el => el.name));
                return Array.from(names);
            });

            if (radioGroups.length === 0) {
                logger("No voting elements found. Process might be finished.");
                break;
            }

            logger(`Processing ${radioGroups.length} items...`);

            for (const name of radioGroups) {
                const radios = page.locator(`input[name="${name}"]`);
                const count = await radios.count();
                if (count > choiceIndex) {
                    await radios.nth(choiceIndex).check();
                } else if (count > 0) {
                    await radios.last().check();
                }
            }

            logger("Saving choices...");
            const saveButton = page.locator('input[type="submit"], button').filter({ hasText: /حفظ|Save|Submit/i });

            const navigationPromise = page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => { });

            if (await saveButton.count() > 0) {
                await saveButton.first().click();
            } else {
                const fallbackSave = page.locator('input[id*="Submit"], input[id*="Save"], button[class*="save"]').first();
                if (await fallbackSave.count() > 0) {
                    await fallbackSave.click();
                }
            }

            await navigationPromise;
            await page.waitForTimeout(2000);

            // Re-nav if we left the vote page
            if (!page.url().includes(new URL(voteUrl).pathname)) {
                logger("Redirect detected. Returning to voting page...");
                await page.goto(voteUrl, { waitUntil: "networkidle" }).catch(() => { });
            }
        }

        logger("Automation task finished.");
    } catch (error) {
        logger(`Error: ${error.message}`);
    } finally {
        logger("Closing in 3 seconds...");
        await page.waitForTimeout(3000);
        await browser.close();
    }
}
