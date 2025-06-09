import * as dotenv from "dotenv";
import * as path from "path";

const envPath = path.resolve(".env");
dotenv.config({ path: envPath });

// API configuration
export const base_url = `${process.env.BASE_URL}`;
export const headers = {
  Authorization: `${process.env.USER_TOKEN}`,
  Company: `${process.env.ENTERPRISE_TOKEN}`,
  accept: "application/json",
};
