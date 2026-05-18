const fs = require('fs');
let code = fs.readFileSync('services/dataService.ts', 'utf8');

// Add the apiCall helper at the top
const apiCallCode = `
async function apiCall(method, collection, id, data) {
  const url = id ? \`/api/data/\${collection}/\${id}\` : \`/api/data/\${collection}\`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) options.body = JSON.stringify(data);
  const res = await fetch(url, options);
  if (!res.ok) throw new Error('API request failed');
  return res.json();
}
`;

code = code.replace(/function removeUndefined[^\n]+[\s\S]+?\}\n/, match => match + '\n' + apiCallCode);

// Map collections
const models = [
  { method: 'getDrivers', col: 'drivers', type: 'Driver' },
  { method: 'getZones', col: 'zones', type: 'Zone' },
  { method: 'getUsers', col: 'users', type: 'SystemUser' },
  { method: 'getOrders', col: 'orders', type: 'Order' },
  { method: 'getFundRequests', col: 'fund_requests', type: 'FundRequest' },
  { method: 'getProducts', col: 'products', type: 'Product' }
];

for (const m of models) {
  // Replace get method body logic
  const getRegex = new RegExp(`(${m.method}:\\s*async\\s*\\(\\):\\s*Promise<${m.type}\\[\\]>\\s*=>\\s*\\{[\\s\\S]*?try\\s*\\{)[\\s\\S]*?(catch\\s*\\(error\\)\\s*\\{)`);
  code = code.replace(getRegex, `$1
      const data = await apiCall('GET', '${m.col}');
      localStorage.setItem(STORAGE_KEYS.${m.col.toUpperCase()}, JSON.stringify(data));
      return data;
    } $2`);

  // Replace save method logic
  const sing = m.col.replace(/s$/, '') === 'fund_request' ? 'FundRequest' : m.col.replace(/s$/, '');
  const saveName = `save${sing[0].toUpperCase() + sing.slice(1).replace('System', '')}`;
  const saveRegex = new RegExp(`(${saveName}:\\s*async\\s*\\(\\w+:\\s*(?:${m.type}|Partial<${m.type}>)\\):\\s*Promise<void>\\s*=>\\s*\\{[\\s\\S]*?try\\s*\\{)[\\s\\S]*?(catch\\s*\\(error\\)\\s*\\{)`);
  code = code.replace(saveRegex, `$1
      await apiCall('POST', '${m.col}', null, arguments[0]);
    } $2`);

  // Replace delete method logic
  const delName = `delete${sing[0].toUpperCase() + sing.slice(1).replace('System', '')}`;
  const delRegex = new RegExp(`(${delName}:\\s*async\\s*\\(id:\\s*string(?:,[\\s\\S]*?)?\\):\\s*Promise<void>\\s*=>\\s*\\{[\\s\\S]*?try\\s*\\{)[\\s\\S]*?(catch\\s*\\(error\\)\\s*\\{)`);
  code = code.replace(delRegex, `$1
      await apiCall('DELETE', '${m.col}', id);
    } $2`);
}

// Special case for getUsers (users -> systemUser in api) but api.ts handles collection mapping!
// Special case for AppSettings
const getSetRegex = /(getSettings:\s*async\s*\(\):\s*Promise<AppSettings>\s*=>\s*\{[\s\S]*?try\s*\{)[\s\S]*?(catch\s*\(error\)\s*\{)/;
code = code.replace(getSetRegex, `$1
      const data = await apiCall('GET', 'settings', 'global');
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
      return data;
    } $2`);

const saveSetRegex = /(saveSettings:\s*async\s*\(settings:\s*AppSettings\):\s*Promise<void>\s*=>\s*\{[\s\S]*?try\s*\{)[\s\S]*?(catch\s*\(error\)\s*\{)/;
code = code.replace(saveSetRegex, `$1
      await apiCall('POST', 'settings', null, { ...settings, id: 'global' });
    } $2`);

fs.writeFileSync('services/dataService.ts', code);
console.log('Successfully refactored dataService.ts');
