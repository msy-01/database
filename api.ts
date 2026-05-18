import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export const apiRouter = Router();
const prisma = new PrismaClient();

const collectionToModel: Record<string, string> = {
  'orders': 'order',
  'drivers': 'driver',
  'users': 'systemUser',
  'fund_requests': 'fundRequest',
  'products': 'product',
  'settings': 'appSettings',
  'zones': 'zone',
  'config': 'config',
  'stockLivreurs': 'stockLivreurEntry',
  'stock_operations': 'stockOperation',
  'configs': 'productFinancialConfig',
  'daily_entries': 'dailyFinancialEntry',
  'daily_finance': 'dailyFinanceData',
  'adhoc_products': 'adHocProduct',
  'purchase_orders': 'purchaseOrder',
  'accounting_entries': 'accountingEntry'
};

apiRouter.get('/:collection', async (req, res) => {
  const modelName = collectionToModel[req.params.collection];
  if (!modelName) return res.status(404).json({ error: 'Collection not found' });
  
  try {
    const data = await (prisma as any)[modelName].findMany();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

apiRouter.get('/:collection/:id', async (req, res) => {
  const modelName = collectionToModel[req.params.collection];
  if (!modelName) return res.status(404).json({ error: 'Collection not found' });
  
  try {
    const data = await (prisma as any)[modelName].findUnique({ where: { id: req.params.id } });
    if (data) res.json(data);
    else res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

apiRouter.post('/:collection', async (req, res) => {
  const modelName = collectionToModel[req.params.collection];
  if (!modelName) return res.status(404).json({ error: 'Collection not found' });
  
  try {
    const data = req.body;
    
    // Convert string dates back to Date objects where needed
    for (const key of ['date', 'assignedAt', 'deliveredAt', 'postponedAt', 'scheduledAt', 'importedAt']) {
      if (data[key]) data[key] = new Date(data[key]);
    }

    if (data.id) {
       const result = await (prisma as any)[modelName].upsert({
         where: { id: data.id },
         update: data,
         create: data
       });
       res.json(result);
    } else {
       const result = await (prisma as any)[modelName].create({ data });
       res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

apiRouter.delete('/:collection/:id', async (req, res) => {
  const modelName = collectionToModel[req.params.collection];
  if (!modelName) return res.status(404).json({ error: 'Collection not found' });
  
  try {
    await (prisma as any)[modelName].delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
