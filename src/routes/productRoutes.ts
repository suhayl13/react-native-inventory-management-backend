import express, {Router} from "express";
import {
    importShopifyProducts, 
    getProductDetailsFromBarcode, 
    getBarcodeDetailsOfProducts,
    getBarcodeDetailsOfAllProducts
} from "../controllers/productControllers";

const router: Router = express.Router();

router.get("/import", importShopifyProducts);
router.get("/products", getBarcodeDetailsOfProducts)
router.get("/products/all", getBarcodeDetailsOfAllProducts)
router.get("/products/:barcode", getProductDetailsFromBarcode);

export default router;