ERC-20 Token Transfers CSV Exporter

Small CLI tool to fetch ERC-20 token transfer history for an address from Etherscan-style APIs (Etherscan, BaseScan, Arbiscan) and save results as a CSV file.

Requirements
- Python 3.8+
- See `requirements.txt` for Python dependencies.

Quick usage

1. Install dependencies:
```bash
python -m pip install -r requirements.txt
```

2. Run the script:
```bash
python src/download_transfers.py --network ethereum --address 0x... --apikey YOUR_KEY --out transfers.csv
```

Notes
- You need API keys for the services. The script looks for environment variables if you don't pass `--apikey`:
  - `ETHERSCAN_API_KEY` for Ethereum
  - `BASESCAN_API_KEY` for Base
  - `ARBISCAN_API_KEY` for Arbitrum
 
  Note on Etherscan API V2
  - As of 2025 Etherscan migrated to a unified V2 API. The script uses the V2 base path for supported chains and supplies the appropriate `chainid` parameter for Ethereum (1), Base (8453), and Arbitrum (42161). If you see a deprecation message like `NOTOK` referencing V1, provide a V2-compatible API base using `--api-base` or update your environment keys.
- Default API base URLs are provided for each network but some networks may use different provider domains; if a request fails, provide a correct API base URL using `--api-base`.
- The script pages through results and converts raw token `value` into a human-readable amount using the token's `tokenDecimal` from the API.

License: MIT
