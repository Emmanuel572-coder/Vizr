import { objectsToMatrix } from '../utils/fileNormalizationEngine';

/**
 * Helper to format monetary figures with commas from the end (e.g. 1935263 -> "1,935,263").
 * Preserves null or 'N/A' strings for data health scanner checks.
 */
export function formatWithCommas(value: number | string | null | undefined): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'null') {
      return value;
    }
    const clean = parseFloat(trimmed.replace(/,/g, ''));
    if (!isNaN(clean)) {
      return clean.toLocaleString('en-US');
    }
    return value;
  }
  if (typeof value === 'number') {
    if (isNaN(value)) return value;
    return value.toLocaleString('en-US');
  }
  return value;
}

export interface GeneratedDataset {
  id: string;
  title: string;
  subtitle: string;
  iconName: 'jumia' | 'bus' | 'tech' | 'export' | 'film';
  records: Record<string, any>[];
  headers: string[];
  matrix: string[][];
}

/**
 * 1. Dataset A: Jumia/Konga Sales
 * Columns: Order Date, Item, Region, Payment, Revenue (NGN)
 * Generates 35 rows as an Array of Objects strictly containing explicit string keys.
 */
export function generateJumiaKongaSales(): Record<string, any>[] {
  const items = [
    { name: 'iPhone 15 Pro Max 256GB', minPrice: 1650000, maxPrice: 1950000 },
    { name: 'Samsung Galaxy A54 5G', minPrice: 380000, maxPrice: 420000 },
    { name: 'Oraimo FreePods 4 ANC', minPrice: 35000, maxPrice: 48000 },
    { name: 'Infinix Hot 40i 128GB', minPrice: 145000, maxPrice: 175000 },
    { name: 'Hisense 55" 4K Smart TV', minPrice: 490000, maxPrice: 560000 },
    { name: 'Century 3.5kVA Generator', minPrice: 320000, maxPrice: 390000 },
    { name: 'Binatone Blender & Grinder', minPrice: 28000, maxPrice: 42000 },
    { name: 'Nike Air Force 1 Low', minPrice: 75000, maxPrice: 110000 },
    { name: 'Haier Thermocool 200L Refrigerator', minPrice: 420000, maxPrice: 510000 },
    { name: 'Tecno Camon 30 Premier', minPrice: 395000, maxPrice: 450000 },
    { name: 'Nexus 18" Standing Fan', minPrice: 45000, maxPrice: 65000 },
    { name: 'Anker PowerCore 20000mAh', minPrice: 42000, maxPrice: 58000 },
    { name: 'Sony PlayStation 5 Digital', minPrice: 720000, maxPrice: 840000 },
    { name: 'HP Pavilion 15 Core i5 16GB', minPrice: 680000, maxPrice: 790000 },
    { name: 'Scanfrost 4-Burner Gas Cooker', minPrice: 185000, maxPrice: 235000 },
  ];

  const regions = [
    'Lagos Mainland',
    'Lagos Island',
    'Abuja FCT',
    'Port Harcourt',
    'Ibadan',
    'Kano',
    'Enugu',
    'Benin City',
    'Abeokuta',
    'Warri',
  ];

  const payments = [
    'Card / WebPay',
    'Pay on Delivery',
    'Bank Transfer',
    'OPay / PalmPay',
    'USSD',
  ];

  const rows: Record<string, any>[] = [];
  const baseDate = new Date('2024-03-01T08:00:00Z');

  for (let i = 0; i < 35; i++) {
    const item = items[i % items.length];
    const region = regions[(i * 3 + 2) % regions.length];
    const payment = payments[(i * 2 + 1) % payments.length];
    const revenue = Math.round(
      item.minPrice + ((i * 37) % 100) * ((item.maxPrice - item.minPrice) / 100)
    );

    const orderDate = new Date(baseDate.getTime() + i * 19 * 3600 * 1000)
      .toISOString()
      .split('T')[0];

    rows.push({
      'Order Date': orderDate,
      Item: item.name,
      Region: region,
      Payment: payment,
      'Revenue (NGN)': formatWithCommas(revenue),
    });
  }

  return rows;
}

/**
 * 2. Dataset B: BRT/Danfo Fleet Operations
 * Columns: Route, Vehicle ID, Fuel Cost (NGN), Daily Revenue (NGN), Maintenance Status
 * Injects 3-4 null values into numeric columns to trigger Data Health Scanner
 * Generates 35 rows as an Array of Objects strictly containing explicit string keys.
 */
export function generateFleetOperations(): Record<string, any>[] {
  const routes = [
    'Ikorodu - TBS',
    'Oshodi - Abule Egba',
    'CMS - Ajah',
    'Berger - Ojuelegba',
    'Mile 2 - Marina',
    'Ikeja - Yaba',
    'Oyingbo - Costain',
    'Cele - Oshodi',
  ];

  const statuses = [
    'Operational',
    'Operational',
    'Needs Servicing',
    'Operational',
    'In Depot',
    'Inspection Due',
  ];

  const rows: Record<string, any>[] = [];

  for (let i = 0; i < 35; i++) {
    const route = routes[i % routes.length];
    const isBrt = i % 2 === 0;
    const vehicleId = isBrt
      ? `BRT-LAG-${String(100 + i * 7).padStart(4, '0')}`
      : `DAN-OSH-${String(200 + i * 11).padStart(4, '0')}`;

    const baseFuel = isBrt ? 75000 : 38000;
    const baseRevenue = isBrt ? 260000 : 135000;

    let fuelCost: number | null = Math.round(baseFuel + ((i * 43) % 25000));
    let dailyRevenue: number | null = Math.round(baseRevenue + ((i * 59) % 75000));
    const status = statuses[(i * 3 + 1) % statuses.length];

    // INJECT 4 NULL / N/A VALUES INTO NUMERIC COLUMNS TO TRIGGER HEALTH CHECK:
    let finalFuel: any = fuelCost;
    let finalRev: any = dailyRevenue;
    if (i === 4) finalFuel = 'N/A'; // N/A fuel cost
    if (i === 12) finalRev = null; // Missing daily revenue
    if (i === 21) finalFuel = 'n/a'; // n/a fuel cost
    if (i === 29) finalRev = 'N/A'; // N/A daily revenue

    rows.push({
      Route: route,
      'Vehicle ID': vehicleId,
      'Fuel Cost (NGN)': formatWithCommas(finalFuel),
      'Daily Revenue (NGN)': formatWithCommas(finalRev),
      'Maintenance Status': status,
    });
  }

  return rows;
}

/**
 * 3. Dataset C: Yaba Tech Hub Payroll
 * Columns: Employee Role, Level, Monthly Salary(NGN), Performance Score
 * STRICT STRUCTURE: Array of Objects where every single object explicitly contains the 4 column headers as its keys.
 */
export function generateTechHubPayroll(): Record<string, any>[] {
  const yabaDataset: Record<string, any>[] = [
    {
      'Employee Role': 'Senior Backend Engineer',
      'Level': 'Mid-Level',
      'Monthly Salary(NGN)': formatWithCommas(950000),
      'Performance Score': 75,
    },
    {
      'Employee Role': 'Principal Product Designer',
      'Level': 'Lead',
      'Monthly Salary(NGN)': formatWithCommas(2500341),
      'Performance Score': 98,
    },
    {
      'Employee Role': 'Data Analyst & BI Specialist',
      'Level': 'Principal',
      'Monthly Salary(NGN)': formatWithCommas(3301054),
      'Performance Score': 97,
    },
  ];

  const roles = [
    'Senior Backend Engineer',
    'Principal Product Designer',
    'Frontend Engineer',
    'DevOps & Cloud Architect',
    'Data Analyst & BI Specialist',
    'Product Manager',
    'QA Automation Engineer',
    'Mobile Engineer (Flutter)',
    'Growth & Performance Marketer',
    'Engineering Team Lead',
  ];

  const levels = ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal'];

  for (let i = 3; i < 35; i++) {
    const role = roles[i % roles.length];
    const level = levels[(i * 2 + 1) % levels.length];

    let baseSalary = 550000;
    if (level === 'Mid-Level') baseSalary = 950000;
    if (level === 'Senior') baseSalary = 1800000;
    if (level === 'Lead') baseSalary = 2500000;
    if (level === 'Principal') baseSalary = 3300000;

    const salary = baseSalary + ((i * 31) % 180000);
    const score = 72 + ((i * 7 + 3) % 27); // 72 to 98

    yabaDataset.push({
      'Employee Role': role,
      'Level': level,
      'Monthly Salary(NGN)': formatWithCommas(salary),
      'Performance Score': score,
    });
  }

  return yabaDataset;
}

/**
 * 4. Dataset D: Cocoa & Cashew Exports
 * Columns: Export Month, Crop Type, Tons Exported, Destination, Agent Fees (NGN)
 * Generates 36 rows as an Array of Objects strictly containing explicit string keys.
 */
export function generateCocoaCashewExports(): Record<string, any>[] {
  const crops = [
    'Fermented Cocoa Beans',
    'Raw Cashew Nuts',
    'Processed Cocoa Butter',
    'Organic Cashew Kernels',
    'Natural Cocoa Liquor',
  ];

  const destinations = [
    'Netherlands (Rotterdam)',
    'Vietnam (Ho Chi Minh)',
    'Germany (Hamburg)',
    'India (Mumbai)',
    'United States (New York)',
    'Malaysia (Port Klang)',
    'Belgium (Antwerp)',
  ];

  const months = [
    'Jan 2024',
    'Feb 2024',
    'Mar 2024',
    'Apr 2024',
    'May 2024',
    'Jun 2024',
    'Jul 2024',
    'Aug 2024',
    'Sep 2024',
    'Oct 2024',
    'Nov 2024',
    'Dec 2024',
  ];

  const rows: Record<string, any>[] = [];

  for (let i = 0; i < 36; i++) {
    const month = months[i % months.length];
    const crop = crops[(i * 3) % crops.length];
    const destination = destinations[(i * 2 + 1) % destinations.length];
    const tons = 45 + ((i * 23 + 17) % 360);
    const feePerTon = 14500 + ((i * 91) % 4500);
    const agentFees = tons * feePerTon;

    rows.push({
      'Export Month': month,
      'Crop Type': crop,
      'Tons Exported': tons,
      Destination: destination,
      'Agent Fees (NGN)': formatWithCommas(agentFees),
    });
  }

  return rows;
}

/**
 * 5. Dataset E: Nollywood Film Budget
 * Columns: Expense Category, Planned Budget (NGN), Actual Spend (NGN)
 * Injects 3-4 null values into numeric columns to trigger Data Health Scanner
 * Generates 32 rows as an Array of Objects strictly containing explicit string keys.
 */
export function generateNollywoodBudget(): Record<string, any>[] {
  const categories = [
    'Principal Lead Cast & Stars',
    'RED Komodo & Cine Lenses Rental',
    'Location Scouting & Island Permits',
    'Cinematography & Master Lighting Rig',
    'Sound Design, Foley & Orchestral Score',
    'VFX, 3D Explosions & CGI Cleanup',
    'Traditional Yoruba Regalia & Wardrobe',
    'Drone & Aerial FPV Operators',
    'Gaffer, Grips & Crane Operators',
    'Catering & Cast Craft Services',
    'Stunt Coordinators & Pyrotechnics',
    'PR, Influencers & Cinema Premiere',
    'Color Grading (DaVinci Resolve) & Conforming',
    'Distribution Fees & Cinema DCP Mastering',
    'SFX Make-up & Prosthetic Artist',
    'Mobile Police Escorts & Set Security',
  ];

  const rows: Record<string, any>[] = [];

  for (let i = 0; i < 32; i++) {
    const category = categories[i % categories.length];
    const isRepeat = i >= 16;
    const itemLabel = isRepeat ? `${category} (Phase 2)` : category;

    const basePlanned = 4500000 + ((i * 179) % 22000000);
    const variancePercent = ((i * 13) % 25) - 10; // -10% to +15%
    let plannedBudget: number | null = Math.round(basePlanned);
    let actualSpend: number | null = Math.round(basePlanned * (1 + variancePercent / 100));

    // INJECT 4 NULL / N/A VALUES INTO NUMERIC COLUMNS TO TRIGGER HEALTH CHECK:
    let finalActual: any = actualSpend;
    let finalPlanned: any = plannedBudget;
    if (i === 3) finalActual = 'N/A'; // N/A actual spend
    if (i === 10) finalPlanned = 'n/a'; // n/a planned budget
    if (i === 18) finalActual = null; // Missing actual spend
    if (i === 26) finalPlanned = 'N/A'; // N/A planned budget

    rows.push({
      'Expense Category': itemLabel,
      'Planned Budget (NGN)': formatWithCommas(finalPlanned),
      'Actual Spend (NGN)': formatWithCommas(finalActual),
    });
  }

  return rows;
}

/**
 * Main procedural loader for the 5 Nigerian Sample Datasets
 */
export function getProceduralDataset(id: string): GeneratedDataset | null {
  let records: Record<string, any>[] = [];
  let title = '';
  let subtitle = '';
  let iconName: GeneratedDataset['iconName'] = 'jumia';

  switch (id) {
    case 'jumia-konga':
      records = generateJumiaKongaSales();
      title = 'Jumia & Konga E-Commerce Sales';
      subtitle = 'Order dates, regional delivery, payment channels & NGN revenue';
      iconName = 'jumia';
      break;

    case 'brt-danfo':
      records = generateFleetOperations();
      title = 'BRT & Danfo Fleet Operations';
      subtitle = 'Transit routes, vehicle telemetry, fuel costs & health check audit';
      iconName = 'bus';
      break;

    case 'yaba-payroll':
      records = generateTechHubPayroll();
      title = 'Yaba Tech Hub Engineering Payroll';
      subtitle = 'Software roles, seniority levels, monthly NGN salaries & scores';
      iconName = 'tech';
      break;

    case 'cocoa-cashew':
      records = generateCocoaCashewExports();
      title = 'Cocoa & Cashew Agribusiness Exports';
      subtitle = 'Export months, commodities, maritime destinations & tonnage';
      iconName = 'export';
      break;

    case 'nollywood-budget':
      records = generateNollywoodBudget();
      title = 'Nollywood Blockbuster Film Budget';
      subtitle = 'Production expenses, planned vs actual spend & audit triggers';
      iconName = 'film';
      break;

    default:
      return null;
  }

  const { headers, matrix } = objectsToMatrix(records);

  return {
    id,
    title,
    subtitle,
    iconName,
    records,
    headers,
    matrix,
  };
}

export const NIGERIAN_SAMPLE_CARDS: {
  id: string;
  title: string;
  badge?: string;
  tagline: string;
}[] = [
  {
    id: 'jumia-konga',
    title: 'Jumia/Konga Sales',
    tagline: 'Order Date, Item, Region, Payment, Revenue',
  },
  {
    id: 'brt-danfo',
    title: 'BRT/Danfo Fleet',
    badge: 'Health Audit',
    tagline: 'Routes, Fuel Costs, Revenue & Status',
  },
  {
    id: 'yaba-payroll',
    title: 'Yaba Tech Payroll',
    tagline: 'Role, Seniority, Monthly Salary & Score',
  },
  {
    id: 'cocoa-cashew',
    title: 'Cocoa & Cashew Export',
    tagline: 'Month, Crop Type, Tons & Destinations',
  },
  {
    id: 'nollywood-budget',
    title: 'Nollywood Budget',
    badge: 'Health Audit',
    tagline: 'Category, Planned Budget vs Actual Spend',
  },
];
