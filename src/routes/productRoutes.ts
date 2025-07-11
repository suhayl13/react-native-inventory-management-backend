import express, {Router} from "express";
import {importShopifyProducts, getProductDetailsFromBarcode} from "../controllers/productControllers";

const router: Router = express.Router()

router.get("/import", importShopifyProducts)
router.get("/product/:barcode", getProductDetailsFromBarcode)

export default router;