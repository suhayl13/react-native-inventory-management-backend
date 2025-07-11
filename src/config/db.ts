import {neon} from "@neondatabase/serverless";
import "dotenv/config";

// Trust me bro type assertion
export const sql = neon(process.env.DATABASE_URL!);

export async function initDB(): Promise<void> {
    try {
        await sql`
        CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        variant_id TEXT UNIQUE NOT NULL,      -- Shopify variant ID (raw, numeric)
        product_id TEXT NOT NULL,             -- Shopify product ID (raw, numeric)
        name TEXT NOT NULL,                   -- Product title
        variant_name TEXT,                    -- Variant Name
        sku TEXT,                             -- Optional Shopify SKU
        price NUMERIC(10, 2),                 -- Variant price
        stock_quantity INT,                   -- Inventory quantity
        barcode TEXT UNIQUE NOT NULL,         -- Short hash ID ( via Hashids)
        updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `
        await sql`
        CREATE TABLE IF NOT EXISTS sync_meta(
        id TEXT PRIMARY KEY,
        last_synced_at TIMESTAMP
        )
        `

        console.log("Database initialized successfully");
    } catch (error) {
        console.log("Error occured in DB:", error);
        process.exit(1) 
    }
    
}