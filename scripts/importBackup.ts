import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const filePath = '/home/chiffer/Téléchargements/colweyz_full_backup_2026-05-18.json';
  
  if (!fs.existsSync(filePath)) {
    console.error(`Le fichier ${filePath} n'existe pas.`);
    return;
  }
  
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(rawData);
  
  console.log("Starting import into PostgreSQL...");

  // Import Users
  if (data.users && Array.isArray(data.users)) {
    console.log(`Importing ${data.users.length} users...`);
    for (const u of data.users) {
      await prisma.systemUser.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          username: u.username || u.id,
          password: u.password || null,
          role: u.role || 'staff',
          permissions: u.permissions || []
        }
      });
    }
  }

  // Import Zones
  if (data.zones && Array.isArray(data.zones)) {
    console.log(`Importing ${data.zones.length} zones...`);
    for (const z of data.zones) {
      await prisma.zone.upsert({
        where: { id: z.id },
        update: {},
        create: {
          id: z.id,
          name: z.name,
          rate: z.rate,
          type: z.type || 'local'
        }
      });
    }
  }

  // Import Drivers
  if (data.drivers && Array.isArray(data.drivers)) {
    console.log(`Importing ${data.drivers.length} drivers...`);
    for (const d of data.drivers) {
      await prisma.driver.upsert({
        where: { id: d.id },
        update: {},
        create: {
          id: d.id,
          name: d.name,
          phone: d.phone || '',
          initialBalance: d.initialBalance || 0,
          status: d.status || 'disponible',
          uid: d.uid || null,
          username: d.username,
          password: d.password,
          stock: d.stock || {},
          gains: d.gains || 0,
          balance: d.balance || 0,
          color: d.color
        }
      });
    }
  }

  // Import Products
  if (data.products && Array.isArray(data.products)) {
    console.log(`Importing ${data.products.length} products...`);
    for (const p of data.products) {
      await prisma.product.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          title: p.title,
          description: p.description,
          vendor: p.vendor,
          productType: p.productType,
          status: p.status || 'actif',
          totalInventory: p.totalInventory,
          mainStock: p.mainStock,
          sellingPrice: p.sellingPrice,
          purchasePrice: p.purchasePrice,
          source: p.source,
          tags: p.tags || [],
          variants: p.variants || [],
          images: p.images || [],
          stockGlobal: p.stockGlobal || null,
          stockDepot: p.stockDepot || null,
          stockLivreurs: p.stockLivreurs || null,
          createdAt: new Date(p.createdAt || Date.now()),
          updatedAt: new Date(p.updatedAt || Date.now())
        }
      });
    }
  }

  // Import Settings
  if (data.settings && data.settings.global) {
    console.log("Importing settings...");
    const s = data.settings.global;
    // Assume ID is "global"
    await prisma.appSettings.upsert({
      where: { id: 'global' },
      update: {},
      create: {
        id: 'global',
        adminPhone: s.adminPhone || '221770000000',
        logoUrl: s.logoUrl,
        shopifyDomain: s.shopifyDomain,
        shopifyAccessToken: s.shopifyAccessToken,
        ignoredShopifyIds: s.ignoredShopifyIds || []
      }
    });
  }

  // Import Orders (Batching would be ideal, but sequential ensures foreign key constraints are met if they exist)
  if (data.orders && Array.isArray(data.orders)) {
    console.log(`Importing ${data.orders.length} orders...`);
    
    const validDriverIds = new Set(data.drivers?.map((d: any) => d.id) || []);
    const validZoneIds = new Set(data.zones?.map((z: any) => z.id) || []);

    const chunkSize = 500;
    for (let i = 0; i < data.orders.length; i += chunkSize) {
      const chunk = data.orders.slice(i, i + chunkSize);
      
      const createData = chunk.map((o: any) => {
        let parsedDate = new Date();
        if (o.date) {
          if (o.date.includes('/')) {
            const [d, m, y] = o.date.split('/');
            parsedDate = new Date(`${y}-${m}-${d}`);
          } else {
            parsedDate = new Date(o.date);
          }
        }
        if (isNaN(parsedDate.getTime())) parsedDate = new Date();

        const safeDate = (d: any) => {
          if (!d) return null;
          const parsed = new Date(d);
          return isNaN(parsed.getTime()) ? null : parsed;
        };

        return {
          id: o.id,
          date: parsedDate,
          clientName: o.clientName || 'Inconnu',
          clientPhone: o.clientPhone,
          address: o.address || 'Non spécifiée',
          productDetails: o.productDetails,
          productId: o.productId,
          products: o.products || [],
          amount: parseFloat(o.amount) || 0,
          deliveryCost: o.deliveryCost,
          status: o.status || 'validé',
          zoneId: (o.zoneId && validZoneIds.has(o.zoneId)) ? o.zoneId : null,
          driverId: (o.driverId && validDriverIds.has(o.driverId)) ? o.driverId : null,
          driverName: o.driverName,
          remuneration: o.remuneration,
          assignedAt: safeDate(o.assignedAt),
          deliveredAt: safeDate(o.deliveredAt),
          postponedAt: safeDate(o.postponedAt),
          scheduledAt: safeDate(o.scheduledAt),
          refusedBy: o.refusedBy,
          paymentMethod: o.paymentMethod,
          modePaiement: o.modePaiement,
          cancelReason: o.cancelReason,
          shippingFee: o.shippingFee,
          isPrePaid: o.isPrePaid,
          regionalPaymentStatus: o.regionalPaymentStatus,
          logs: o.logs || [],
          importedAt: safeDate(o.importedAt),
          purchaseCost: o.purchaseCost,
          linkedOrderIds: o.linkedOrderIds || [],
          isDepotDelivery: o.isDepotDelivery,
          sortieDepotLogged: o.sortieDepotLogged,
          livraisonDepotConfirmee: o.livraisonDepotConfirmee,
          remarks: o.remarks,
          shippingRemarks: o.shippingRemarks,
          assignmentRemarks: o.assignmentRemarks
        };
      });
      
      // Use createMany to insert fast. 
      // Skip duplicates just in case
      await prisma.order.createMany({
        data: createData,
        skipDuplicates: true
      });
      console.log(`Imported ${i + chunk.length} / ${data.orders.length} orders`);
    }
  }

  console.log("Import successfully completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
