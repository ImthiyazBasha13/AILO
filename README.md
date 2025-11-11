ERC-20 Transfers — CSV Export (static webapp)

This is a small single-page app that fetches ERC-20 token-transfer events (tokentx) from Etherscan-like APIs and exports a CSV filtered by token symbol, token contract address, and date range.

Files added:
- `index.html` — UI and form
- `styles.css` — small styles
- `app.js` — main client logic that queries the explorers and creates CSV

How it works
- Enter a full address (0x...) and choose a network: Ethereum (Etherscan), Base (BaseScan), or Arbitrum.
- Optionally filter by token symbol (USDC/USDT) or provide token contract address (preferred).
- Optionally pick start and/or end date.
- Click "Download CSV" to fetch transfer events and download a CSV file.

Notes and assumptions
- The app uses the Etherscan-compatible `account&action=tokentx` endpoint for all selected networks.
  - Etherscan: https://api.etherscan.io/api
  - BaseScan: https://api.basescan.org/api (assumed Etherscan-compatible)
  - Arbiscan: https://api.arbiscan.io/api
- Provided API keys are embedded in `app.js` for convenience (you supplied them). Embedding API keys in client-side code is insecure. If this is a public deployment, consider using a server-side proxy to keep keys secret.

Limitations
- Rate limiting or API differences may cause failures for some networks. If BaseScan uses a different API path or requires other parameters, the calls may fail.
- The app paginates with `page` and `offset=10000` and will fetch multiple pages if needed. Very large histories may be slow or hit rate limits.

Hosting on GitHub Pages
1. Commit these files to the repo's `main` branch (or a `gh-pages` branch).
2. In the GitHub repo settings, enable GitHub Pages to serve the branch/folder (usually root for simple sites).

Security
- Again: API keys are visible in the client. For production usage, move API calls to a small server (Netlify Functions, Vercel serverless, or your own backend) and keep keys private.

If you want, I can:
- Add a simple serverless proxy implementation (Netlify Functions) to hide API keys.
- Improve UI/UX and add more token symbol choices dynamically.
- Add tests or a small development workflow.
