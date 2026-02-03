import { runVote } from "./core/runner.js";

/**
 * CLI Wrapper for AutoVote
 * Usage: node agent.js [ID] [ChoiceIndex]
 */

const TARGET_ID = process.argv[2];
const CHOICE_INDEX = parseInt(process.argv[3]) || 1;

if (!TARGET_ID) {
    console.error("Error: Please provide a National ID.");
    console.log("Usage: node agent.js [ID] [ChoiceIndex]");
    process.exit(1);
}

(async () => {
    await runVote({
        id: TARGET_ID,
        choiceIndex: CHOICE_INDEX,
        logger: (msg) => console.log(`[CLI] ${msg}`)
    });
})();
