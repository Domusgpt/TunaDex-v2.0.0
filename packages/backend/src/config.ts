import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export interface AppConfig {
  PORT: number;
  GITHUB_PAT: string | undefined;
  GITHUB_ORG: string;
  FIREBASE_PROJECT_ID: string | undefined;
  FIREBASE_SA_KEY: string | undefined;
  isDemoMode: boolean;
}

export const config: AppConfig = {
  PORT: parseInt(process.env.PORT ?? "3001", 10),
  GITHUB_PAT: process.env.GITHUB_PAT || undefined,
  GITHUB_ORG: process.env.GITHUB_ORG || "Domusgpt",
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || undefined,
  FIREBASE_SA_KEY: process.env.FIREBASE_SA_KEY || undefined,
  isDemoMode: !process.env.GITHUB_PAT,
};
