# AutoVote Framework

A scalable and dynamic automation framework built with Playwright to handle routine voting tasks across various academic and professional platforms.

## current Status
Currently optimized for **Tanta University Engineering** voting portal.

## Features
- **Dynamic ID Input**: Run automation for any student ID.
- **Customizable Choices**: Select between different voting options (a, b, c, etc.).
- **Smart Looping**: Automatically detects and completes all available voting items.
- **Review Mode**: Pauses at the end for final human verification.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- Playwright

### Installation
```powershell
npm install
npx playwright install chromium
```

### Usage
Run the script with an ID and a choice index (0 for 'a', 1 for 'b', etc.):
```powershell
node agent.js [NATIONAL_ID] [CHOICE_INDEX]

# Example: Vote 'b' for a specific ID
node agent.js 44444444444444 1
```

## Upcoming Architecture
This project is currently being refactored into a modular system:
- `sites/`: Site-specific logic (e.g., Tanta, etc.).
- `core/`: Generic automation engine.
- `batch/`: Automated lists of IDs for routine batch processing.

## License
MIT
