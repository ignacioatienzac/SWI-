import { PowerVerb } from "../types";

// Data now loaded from conjugaciones-verbos.json to avoid duplication
let cachedData: PowerVerb[] | null = null;

export async function loadPowerVerbsData(): Promise<PowerVerb[]> {
  if (cachedData) {
    return cachedData;
  }
  
  const response = await fetch('/data/conjugaciones-verbos.json');
  const data: PowerVerb[] = await response.json();
  cachedData = data;
  return data;
}

// Deprecated: Use loadPowerVerbsData() instead
export const powerVerbsData: PowerVerb[] = [];
