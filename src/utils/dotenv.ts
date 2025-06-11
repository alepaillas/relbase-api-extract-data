import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../../relbase-api/.env");
// console.log(envPath);
dotenv.config({ path: envPath });

// API configuration
export const base_url = `${process.env.BASE_URL}`;
// console.log(base_url);
export const headers = {
  Authorization: `${process.env.USER_TOKEN}`,
  Company: `${process.env.ENTERPRISE_TOKEN}`,
  accept: "application/json",
};
