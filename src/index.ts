import express, {Express} from "express"
import dotenv from "dotenv"
import { initDB } from "./config/db";
import productRoutes from "./routes/productRoutes";

dotenv.config();

const app: Express = express();
const port: string | undefined = process.env.PORT;

app.use(express.json());

app.use("/api", productRoutes);

initDB().then(() => app.listen(port, () => {
    console.log("Server is listening on port:", port)
}))