import express, {Router} from "express";
import {importShopifyProducts} from "../controllers/productControllers";

const router: Router = express.Router()

router.get("/import", importShopifyProducts)
router.get("/product/:barcode")

export default router;