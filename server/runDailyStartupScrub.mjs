import { runDailyStartupScrub } from "./dailyStartupScrub.mjs";

const defaultCompanies = [
  { name: "FjordGrid", sector: "Climate & energy", relationship: "invested" },
  { name: "ClinicaFlow", sector: "Health & biotech", relationship: "following" },
  { name: "AtlasPay", sector: "Fintech", relationship: "invested" },
];

function companiesFromEnvironment() {
  if (!process.env.FOLLOWED_COMPANIES) return defaultCompanies;
  try {
    const parsed = JSON.parse(process.env.FOLLOWED_COMPANIES);
    if (!Array.isArray(parsed)) throw new Error("value is not an array");
    return parsed;
  } catch (error) {
    throw new Error(`FOLLOWED_COMPANIES must be a JSON array: ${error.message}`);
  }
}

const result = await runDailyStartupScrub({ followedCompanies: companiesFromEnvironment() });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
