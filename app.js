// Minimal SPA to fetch ERC-20 token transfers from Etherscan-like APIs and export CSV.
// Note: API keys are embedded as requested. Exposing API keys client-side is insecure; see README.

const API_KEYS = {
  etherscan: '3QMHQSCNBGKZXXZC7I25UG12649EXHHSE7',
  basescan: 'YTT855SCD7E8293Q86Y3ZZKEZIM7R8PU22',
  arbitrum: '5ABZG8QZ33DRNMIEH81AFFDSQEPB6ZZ9BM'
};

// Use the Etherscan API V2 unified base for multichain support and pass chainid
const API_BASE = {
  unified: 'https://api.etherscan.io/v2/api'
};

// chain ids for the supported networks
const CHAIN_ID = {
  etherscan: 1,      // Ethereum Mainnet
  basescan: 8453,    // Base Mainnet
  arbitrum: 42161    // Arbitrum One Mainnet
};

// --- DOM ---
const addressInput = document.getElementById('addressInput');
const addressHistoryList = document.getElementById('addressHistoryList');
const addressHistorySelect = document.getElementById('addressHistorySelect');
const networkSelect = document.getElementById('networkSelect');
const tokenSymbolSelect = document.getElementById('tokenSymbol');
const contractAddressInput = document.getElementById('contractAddress'); // may be null if commented out in HTML
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const downloadBtn = document.getElementById('downloadBtn');
const statusBox = document.getElementById('statusBox');
const form = document.getElementById('exportForm');

function setStatus(msg){ statusBox.textContent = msg; }

// Address history per network in localStorage key
function historyKeyForNetwork(net){ return `address_history_${net}`; }
function loadAddressHistory(net){
  try{
    const raw = localStorage.getItem(historyKeyForNetwork(net));
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function saveAddressToHistory(net, addr){
  if(!addr) return;
  addr = addr.trim();
  const key = historyKeyForNetwork(net);
  const list = loadAddressHistory(net);
  // dedupe & move to front
  const filtered = [addr, ...list.filter(a => a.toLowerCase() !== addr.toLowerCase())];
  const trimmed = filtered.slice(0, 20);
  localStorage.setItem(key, JSON.stringify(trimmed));
  populateHistoryUI(net);
}

function populateHistoryUI(net){
  const list = loadAddressHistory(net);
  // datalist
  addressHistoryList.innerHTML = '';
  list.forEach(addr => {
    const opt = document.createElement('option'); opt.value = addr;
    addressHistoryList.appendChild(opt);
  });
  // select (compact)
  addressHistorySelect.innerHTML = '<option value="">⤓</option>' + list.map(a => `<option value="${a}">${a}</option>`).join('');
}

addressHistorySelect.addEventListener('change', ()=>{
  const v = addressHistorySelect.value;
  if(v){ addressInput.value = v; }
  addressHistorySelect.value = '';
});

networkSelect.addEventListener('change', ()=>{
  populateHistoryUI(networkSelect.value);
});

// Utility: convert date string (YYYY-MM-DD) to unix timestamp (seconds)
function dateToTs(dateStr, endOfDay=false){
  if(!dateStr) return null;
  const d = new Date(dateStr + (endOfDay ? 'T23:59:59Z' : 'T00:00:00Z'));
  return Math.floor(d.getTime() / 1000);
}

// Fetch token transfers using explorer API. We'll paginate using 'page' and 'offset'.
// Builds query for module=account&action=tokentx
async function fetchAllTokenTransfers(address, network){
  const api = API_BASE[network];
  const key = API_KEYS[network];
  const results = [];
  let page = 1;
  // use a conservative offset to avoid API rejections/rate-limit issues
  const offset = 1000;
  setStatus('Fetching token transfers — this may take a few seconds...');

  while(true){
  // use the unified V2 endpoint and include chainid
  const base = API_BASE.unified;
  const chainid = CHAIN_ID[network] || 1;
  const url = `${base}?chainid=${chainid}&module=account&action=tokentx&address=${encodeURIComponent(address)}&page=${page}&offset=${offset}&sort=asc&apikey=${key}`;
    // network-specific note: some explorers use same param names; assume compatibility with Etherscan API
    try{
      const resp = await fetch(url);
      if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      // Etherscan-like APIs return status === '0' with a string result when there is an error
      if(json && json.status === '0'){
        // prefer the more descriptive 'result' when available, fall back to 'message'
        const msg = (json.result || json.message || '').toString();
        // common case: "No transactions found" -> treat as end of data
        if(msg.toLowerCase().includes('no transactions') || msg.toLowerCase().includes('no records found')){
          break;
        }
        // otherwise, it's an error (rate limit, invalid API key, etc.)
        throw new Error((json.message ? json.message + ' - ' : '') + msg || 'API returned status 0');
      }
      const items = Array.isArray(json.result) ? json.result : [];
      results.push(...items);
      if(items.length < offset) break; // last page
      page += 1;
      // small pause to be conservative with rate limits
      await new Promise(r => setTimeout(r, 300));
    }catch(err){
      // include response debug in the thrown message for easier diagnosis
      throw new Error(`Failed fetching page ${page}: ${err.message}`);
    }
  }
  return results;
}

function filterBySymbolOrContract(items, symbol, contract){
  return items.filter(tx => {
    if(contract){
      if((tx.contractAddress || '').toLowerCase() !== contract.toLowerCase()) return false;
    } else if(symbol){
      if((tx.tokenSymbol || '').toUpperCase() !== symbol.toUpperCase()) return false;
    }
    return true;
  });
}

function filterByDateRange(items, startTs, endTs){
  if(!startTs && !endTs) return items;
  return items.filter(tx => {
    const t = Number(tx.timeStamp || tx.timestamp || 0);
    if(startTs && t < startTs) return false;
    if(endTs && t > endTs) return false;
    return true;
  });
}

function toCsv(items){
  // Use Etherscan token transfer CSV header shape
  const header = [
    'blockNumber','timeStamp','hash','nonce','blockHash','from','to','value','contractAddress','tokenName','tokenSymbol','tokenDecimal','transactionIndex','gas','gasPrice','gasUsed','cumulativeGasUsed','input','confirmations'
  ];
  const rows = [header.join(',')];
  for(const tx of items){
    const row = header.map(h => {
      let v = tx[h] !== undefined ? tx[h] : '';
      // strings -> escape quotes
      if(typeof v === 'string'){
        // remove newlines
        v = v.replace(/\r?\n/g, ' ');
        if(v.includes(',') || v.includes('"')) v = '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    }).join(',');
    rows.push(row);
  }
  return rows.join('\n');
}

function downloadBlob(filename, content){
  const blob = new Blob([content], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const address = addressInput.value.trim();
  if(!address){ setStatus('Please enter an address.'); return; }
  const network = networkSelect.value;
  const symbol = tokenSymbolSelect.value.trim();
  const contract = contractAddressInput && contractAddressInput.value ? contractAddressInput.value.trim() : '';
  const startTs = dateToTs(startDateInput.value, false);
  const endTs = dateToTs(endDateInput.value, true);

  saveAddressToHistory(network, address);
  try{
    setStatus('Fetching transfers...');
    const items = await fetchAllTokenTransfers(address, network);
    if(!items.length){ setStatus('No token transfers found for this address.'); return; }
    let filtered = filterBySymbolOrContract(items, symbol, contract);
    filtered = filterByDateRange(filtered, startTs, endTs);
    if(!filtered.length){ setStatus('No transfers match the filters.'); return; }
    const csv = toCsv(filtered);
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    const filename = `transfers_${address}_${network}_${ts}.csv`;
    downloadBlob(filename, csv);
    setStatus(`Exported ${filtered.length} rows to ${filename}`);
  }catch(err){
    setStatus('Error: ' + err.message);
    console.error(err);
  }
});

// initialize UI
populateHistoryUI(networkSelect.value);
setStatus('Ready.');
