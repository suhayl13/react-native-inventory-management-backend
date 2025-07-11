import { Request, Response } from "express";
import axios from "axios";
import { sql } from "../config/db";
import Hashids from "hashids";

const apiVersion = process.env.SHOPIFY_API_VERSION || "2025-07";
const shopifyEndpoint = `https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
const hashids = new Hashids("fitapp-salt", 8);

export async function importShopifyProducts(_req: Request, res: Response) {
  let hasNextPage = true;
  let cursor: string | null = null;
  let totalImported = 0;

  // 🔍 Step 1: Get last sync time
  const syncRecord = await sql`
    SELECT last_synced_at FROM sync_meta WHERE id = 'shopify' LIMIT 1
  `;
  const lastSyncedAt = syncRecord[0]?.last_synced_at ? new Date(syncRecord[0].last_synced_at) : new Date(0); // default to epoch

  try {
    while (hasNextPage) {
      // 🔁 Step 2: Build paginated GraphQL query
      const query: string = `
        {
          products(first: 50, sortKey: UPDATED_AT, reverse: true${cursor ? `, after: "${cursor}"` : ""}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                title
                updatedAt
                variants(first: 50) {
                  edges {
                    node {
                      id
                      title
                      sku
                      price
                      inventoryQuantity
                    }
                  }
                }
              }
            }
          }
        }
      `;

      // 📦 Step 3: Fetch from Shopify
      const response = await axios.post<{ data: any }>(shopifyEndpoint, { query }, {
        headers: {
          "X-Shopify-Access-Token": process.env.SHOPIFY_TOKEN!,
          "Content-Type": "application/json",
        },
      });

      const products = response.data.data.products.edges;
      const pageInfo = response.data.data.products.pageInfo;

      for (const productEdge of products) {
        const product = productEdge.node;
        const productId = product.id.split("/").pop();
        const updatedAt = new Date(product.updatedAt);

        // ⏹️ Step 4: Stop early if product is older than last sync
        if (updatedAt <= lastSyncedAt) {
          hasNextPage = false;
          break;
        }

        for (const variantEdge of product.variants.edges) {
          const variant = variantEdge.node;
          const variantIdRaw = variant.id.split("/").pop();
          const sku = variant.sku;
          const price = parseFloat(variant.price || "0.00");
          const stock = parseInt(variant.inventoryQuantity ?? "0");
          const barcode = hashids.encode(+variantIdRaw!);
          const variantName = variant.title;

          // 💾 Step 5: Insert or update in DB
          await sql`
            INSERT INTO products
              (variant_id, product_id, name, variant_name, sku, price, stock_quantity, barcode, updated_at)
            VALUES
              (${variantIdRaw}, ${productId}, ${product.title}, ${variantName}, ${sku}, ${price}, ${stock}, ${barcode}, ${updatedAt.toISOString()})
            ON CONFLICT (barcode) DO UPDATE
            SET price = EXCLUDED.price,
                stock_quantity = EXCLUDED.stock_quantity,
                name = EXCLUDED.name,
                variant_name = EXCLUDED.variant_name,
                sku = EXCLUDED.sku,
                updated_at = EXCLUDED.updated_at;
          `;

          totalImported++;
        }
      }

      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;

      await new Promise((r) => setTimeout(r, 300)); // optional rate limit throttle
    }

    // ✅ Step 6: Update sync_meta
    await sql`
      INSERT INTO sync_meta (id, last_synced_at)
      VALUES ('shopify', NOW())
      ON CONFLICT (id) DO UPDATE SET last_synced_at = EXCLUDED.last_synced_at
    `;

    res.status(200).json({ message: `✅ Imported ${totalImported} new/updated variants.` });
  } catch (err) {
    console.error("❌ Shopify sync failed:", err);
    res.status(500).json({ error: "Failed to sync Shopify products." });
  }
}

export async function getProductDetailsFromBarcode(req: Request<{barcode:string}>, res: Response) {
  try {
    const { barcode } = req.params
    const transactions = await sql`SELECT * FROM products WHERE barcode = ${barcode}`
    res.status(200).json(transactions[0])
  } catch (error) {
      res.status(500).json({message: "Internal Server Error!!!"})
      console.log(error)
  }
  
}
