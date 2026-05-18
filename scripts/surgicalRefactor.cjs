const { Project, SyntaxKind } = require('ts-morph');

const project = new Project();
const sourceFile = project.addSourceFileAtPath('services/dataService.ts');

const apiCallCode = `async function apiCall(method: string, collection: string, id?: string | null, data?: any) {
  try {
      const url = id ? '/api/data/' + collection + '/' + id : '/api/data/' + collection;
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (data) options.body = JSON.stringify(data);
      const res = await fetch(url, options);
      if (!res.ok) throw new Error('API request failed');
      return res.json();
  } catch (e) {
      console.error("API Fetch Error:", e);
      throw e;
  }
}
`;

// Insert it right before `// --- LOCAL STORAGE LOGIC (FALLBACK) ---`
const lsIndex = sourceFile.getText().indexOf("// --- LOCAL STORAGE LOGIC (FALLBACK) ---");
if (!sourceFile.getText().includes('async function apiCall')) {
  sourceFile.insertText(lsIndex, apiCallCode + '\n\n');
}

const methodsToPatch = [
  { name: 'getDrivers', fetchLogic: "const data = await apiCall('GET', 'drivers'); return data;" },
  { name: 'saveDriver', fetchLogic: "await apiCall('POST', 'drivers', null, driver); return;" },
  { name: 'deleteDriver', fetchLogic: "await apiCall('DELETE', 'drivers', id); return;" },
  
  { name: 'getZones', fetchLogic: "const data = await apiCall('GET', 'zones'); return data;" },
  { name: 'saveZone', fetchLogic: "await apiCall('POST', 'zones', null, zone); return;" },
  { name: 'deleteZone', fetchLogic: "await apiCall('DELETE', 'zones', id); return;" },

  { name: 'getOrders', fetchLogic: "const data = await apiCall('GET', 'orders'); return data.map((o: any) => ({ ...o, date: new Date(o.date) }));" },
  { name: 'saveOrder', fetchLogic: "await apiCall('POST', 'orders', null, order); return;" },
  { name: 'deleteOrder', fetchLogic: "await apiCall('DELETE', 'orders', id); return;" },

  { name: 'getFundRequests', fetchLogic: "const data = await apiCall('GET', 'fund_requests'); return data;" },
  { name: 'saveFundRequest', fetchLogic: "await apiCall('POST', 'fund_requests', null, request); return;" },
  { name: 'deleteFundRequest', fetchLogic: "await apiCall('DELETE', 'fund_requests', id); return;" },

  { name: 'getUsers', fetchLogic: "const data = await apiCall('GET', 'users'); return data;" },
  { name: 'saveUser', fetchLogic: "await apiCall('POST', 'users', null, user); return;" },
  { name: 'deleteUser', fetchLogic: "await apiCall('DELETE', 'users', id); return;" },

  { name: 'getProducts', fetchLogic: "const data = await apiCall('GET', 'products'); return data;" },
  { name: 'saveProduct', fetchLogic: "await apiCall('POST', 'products', null, product); return;" },
  { name: 'deleteProduct', fetchLogic: "await apiCall('DELETE', 'products', id); return;" },

  { name: 'getFinancialConfigs', fetchLogic: "const data = await apiCall('GET', 'configs'); return data;" },
  { name: 'saveFinancialConfig', fetchLogic: "await apiCall('POST', 'configs', null, config || arguments[0]); return;" },

  { name: 'getDailyEntries', fetchLogic: "const data = await apiCall('GET', 'daily_entries'); return data;" },
  { name: 'saveDailyEntry', fetchLogic: "await apiCall('POST', 'daily_entries', null, entry || arguments[0]); return;" },

  { name: 'getDailyFinanceData', fetchLogic: "const data = await apiCall('GET', 'daily_finance', date); return data;" },
  { name: 'getAllDailyFinanceData', fetchLogic: "const data = await apiCall('GET', 'daily_finance'); return data;" },
  { name: 'saveDailyFinanceData', fetchLogic: "await apiCall('POST', 'daily_finance', null, data); return;" },

  { name: 'getPurchaseOrders', fetchLogic: "const data = await apiCall('GET', 'purchase_orders'); return data;" },
  { name: 'savePurchaseOrder', fetchLogic: "await apiCall('POST', 'purchase_orders', null, po || arguments[0]); return;" },
  { name: 'deletePurchaseOrder', fetchLogic: "await apiCall('DELETE', 'purchase_orders', id); return;" },

  { name: 'getAdHocProducts', fetchLogic: "const data = await apiCall('GET', 'adhoc_products'); return data;" },
  { name: 'saveAdHocProduct', fetchLogic: "await apiCall('POST', 'adhoc_products', null, product || arguments[0]); return;" },
  { name: 'deleteAdHocProduct', fetchLogic: "await apiCall('DELETE', 'adhoc_products', id); return;" },

  { name: 'getAccountingEntries', fetchLogic: "const data = await apiCall('GET', 'accounting_entries'); return data;" },
  { name: 'saveAccountingEntry', fetchLogic: "await apiCall('POST', 'accounting_entries', null, entry || arguments[0]); return;" },
  { name: 'deleteAccountingEntry', fetchLogic: "await apiCall('DELETE', 'accounting_entries', id); return;" },

  { name: 'getStockLivreurs', fetchLogic: "const data = await apiCall('GET', 'stockLivreurs'); return data;" },
  { name: 'saveStockLivreurEntry', fetchLogic: "await apiCall('POST', 'stockLivreurs', null, entry || arguments[0]); return;" },

  { name: 'getStockOperations', fetchLogic: "const data = await apiCall('GET', 'stock_operations'); return data;" },
  { name: 'saveStockOperation', fetchLogic: "await apiCall('POST', 'stock_operations', null, op || arguments[0]); return;" }
];

const dataServiceDecl = sourceFile.getVariableDeclaration('DataService');
if (dataServiceDecl) {
  const init = dataServiceDecl.getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  for (const m of methodsToPatch) {
     const prop = init.getProperty(m.name);
     if (prop && prop.getKind() === SyntaxKind.PropertyAssignment) {
        const arrowFunc = prop.getInitializerIfKind(SyntaxKind.ArrowFunction);
        if (arrowFunc) {
           const body = arrowFunc.getBody();
           if (body.getKind() === SyntaxKind.Block) {
              const stmts = body.getStatements();
              // Find the if (db && auth.currentUser) statement
              const ifStmt = stmts.find(s => s.getKind() === SyntaxKind.IfStatement && s.getText().includes('db && auth.currentUser'));
              if (ifStmt) {
                  const paramList = arrowFunc.getParameters();
                  const paramName = paramList.length > 0 ? paramList[0].getName() : '';
                  let logic = m.fetchLogic;
                  // Handle arguments mismatch
                  if (paramName && logic.includes('arguments[0]')) {
                     logic = logic.replace('arguments[0]', paramName);
                  }
                  
                  ifStmt.replaceWithText(`try {
        ${logic}
    } catch (e) {
        console.warn('API Error, falling back to local storage for ${m.name}', e);
    }`);
              }
           }
        }
     }
  }
}

sourceFile.saveSync();
console.log('Successfully refactored dataService.ts with ts-morph!');
