export interface DemoSheet {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  fileFormat: 'XLSX' | 'CSV';
  fileName: string;
  iconName: 'coffee' | 'shopping-bag' | 'cloud' | 'laptop' | 'dumbbell';
  badgeColor: string;
  rowCount: number;
  columnCount: number;
  totalVolumeEst: string;
  headers: string[];
  rows: string[][];
}

// 1. Coffee Shop POS (Unique columns: Ticket ID, Item Ordered, Category, Serving Price, Order Time, Tender Method)
const coffeeHeaders = ['Ticket ID', 'Item Ordered', 'Category', 'Serving Price', 'Order Time', 'Tender Method'];
const coffeeRows: string[][] = [
  ['TCK-101', 'Oat Milk Flat White', 'Espresso Bar', '5.50', '2026-03-01 08:15', 'Apple Pay'],
  ['TCK-102', 'Almond Croissant', 'Artisan Bakery', '4.75', '2026-03-01 08:22', 'Credit Card'],
  ['TCK-103', 'Iced Brown Sugar Cold Brew', 'Cold Bar', '6.25', '2026-03-01 08:45', 'Apple Pay'],
  ['TCK-104', 'Avocado & Sourdough Toast', 'Kitchen Hot', '11.50', '2026-03-02 09:10', 'Credit Card'],
  ['TCK-105', 'Ceremonial Matcha Latte', 'Tea & Botanicals', '5.75', '2026-03-02 09:30', 'eWallet'],
  ['TCK-106', 'Cardamom Morning Bun', 'Artisan Bakery', '4.50', '2026-03-02 09:55', 'Cash'],
  ['TCK-107', 'Double Shot Espresso', 'Espresso Bar', '3.75', '2026-03-03 07:45', 'Debit Card'],
  ['TCK-108', 'Breakfast Burrito Deluxe', 'Kitchen Hot', '12.00', '2026-03-03 08:30', 'Credit Card'],
  ['TCK-109', 'Oat Milk Flat White', 'Espresso Bar', '5.50', '2026-03-03 08:50', 'Apple Pay'],
  ['TCK-110', 'Nitro Cold Brew Float', 'Cold Bar', '6.95', '2026-03-04 10:15', 'Credit Card'],
  ['TCK-111', 'Prosciutto & Gruyere Croissant', 'Artisan Bakery', '8.50', '2026-03-04 10:40', 'Credit Card'],
  ['TCK-112', 'Chai Spiced Latte', 'Tea & Botanicals', '5.25', '2026-03-05 11:05', 'Cash'],
  ['TCK-113', 'Blueberry Lemon Scone', 'Artisan Bakery', '4.25', '2026-03-05 11:30', 'Apple Pay'],
  ['TCK-114', 'Iced Brown Sugar Cold Brew', 'Cold Bar', '6.25', '2026-03-06 12:15', 'Credit Card'],
  ['TCK-115', 'Ceremonial Matcha Latte', 'Tea & Botanicals', '5.75', '2026-03-06 13:00', 'Debit Card'],
  ['TCK-116', 'Double Shot Espresso', 'Espresso Bar', '3.75', '2026-03-07 08:00', 'Cash'],
  ['TCK-117', 'Avocado & Sourdough Toast', 'Kitchen Hot', '11.50', '2026-03-07 08:45', 'Apple Pay'],
  ['TCK-118', 'Oat Milk Flat White', 'Espresso Bar', '5.50', '2026-03-08 09:15', 'Credit Card'],
  ['TCK-119', 'Almond Croissant', 'Artisan Bakery', '4.75', '2026-03-08 09:35', 'Apple Pay'],
  ['TCK-120', 'Cardamom Morning Bun', 'Artisan Bakery', '4.50', '2026-03-09 10:00', 'Cash'],
  ['TCK-121', 'Breakfast Burrito Deluxe', 'Kitchen Hot', '12.00', '2026-03-09 10:30', 'Credit Card'],
  ['TCK-122', 'Nitro Cold Brew Float', 'Cold Bar', '6.95', '2026-03-10 11:15', 'Apple Pay'],
  ['TCK-123', 'Ceremonial Matcha Latte', 'Tea & Botanicals', '5.75', '2026-03-10 11:45', 'Debit Card'],
  ['TCK-124', 'Oat Milk Flat White', 'Espresso Bar', '5.50', '2026-03-11 08:30', 'Credit Card'],
  ['TCK-125', 'Iced Brown Sugar Cold Brew', 'Cold Bar', '6.25', '2026-03-11 09:00', 'Apple Pay'],
  ['TCK-126', 'Prosciutto & Gruyere Croissant', 'Artisan Bakery', '8.50', '2026-03-12 09:40', 'Credit Card'],
  ['TCK-127', 'Almond Croissant', 'Artisan Bakery', '4.75', '2026-03-12 10:15', 'Cash'],
  ['TCK-128', 'Avocado & Sourdough Toast', 'Kitchen Hot', '11.50', '2026-03-13 11:00', 'Apple Pay'],
  ['TCK-129', 'Chai Spiced Latte', 'Tea & Botanicals', '5.25', '2026-03-13 11:30', 'Debit Card'],
  ['TCK-130', 'Oat Milk Flat White', 'Espresso Bar', '5.50', '2026-03-14 08:45', 'Credit Card'],
];

// 2. Apparel Retail (Unique columns: Invoice #, Garment Description, Department, Retail Price, Units Sold, Sale Date, Checkout Channel)
const apparelHeaders = ['Invoice #', 'Garment Description', 'Department', 'Retail Price', 'Units Sold', 'Sale Date', 'Checkout Channel'];
const apparelRows: string[][] = [
  ['INV-8801', 'Slim-Fit Selvedge Jeans', 'Denim', '128.00', '1', '2026-02-10', 'Stripe Card'],
  ['INV-8802', 'Technical Performance Joggers', 'Athleisure', '85.00', '2', '2026-02-10', 'Apple Pay'],
  ['INV-8803', 'Classic Stretch Chinos', 'Casual Trousers', '78.00', '1', '2026-02-11', 'PayPal'],
  ['INV-8804', 'Heavyweight French Terry Hoodie', 'Sweatshirts', '95.00', '1', '2026-02-11', 'Stripe Card'],
  ['INV-8805', 'Merino Wool Knit Beanie', 'Accessories', '38.00', '3', '2026-02-12', 'Shop Pay'],
  ['INV-8806', 'Flannel-Lined Utility Work Pants', 'Workwear', '110.00', '1', '2026-02-13', 'Apple Pay'],
  ['INV-8807', 'Waterproof Commuter Parka', 'Outerwear', '245.00', '1', '2026-02-14', 'Stripe Card'],
  ['INV-8808', 'Relaxed Corduroy Overshirt', 'Tops', '88.00', '1', '2026-02-15', 'Stripe Card'],
  ['INV-8809', 'Multi-Pocket Tactical Cargo Shorts', 'Shorts', '65.00', '2', '2026-02-16', 'PayPal'],
  ['INV-8810', 'Tailored Wool Blend Blazer', 'Formalwear', '220.00', '1', '2026-02-17', 'Stripe Card'],
  ['INV-8811', 'Technical Performance Joggers', 'Athleisure', '85.00', '1', '2026-02-18', 'Apple Pay'],
  ['INV-8812', 'Slim-Fit Selvedge Jeans', 'Denim', '128.00', '1', '2026-02-19', 'Shop Pay'],
  ['INV-8813', 'Heavyweight French Terry Hoodie', 'Sweatshirts', '95.00', '2', '2026-02-20', 'Stripe Card'],
  ['INV-8814', 'Classic Stretch Chinos', 'Casual Trousers', '78.00', '1', '2026-02-21', 'Apple Pay'],
  ['INV-8815', 'Waterproof Commuter Parka', 'Outerwear', '245.00', '1', '2026-02-22', 'Stripe Card'],
  ['INV-8816', 'Merino Wool Knit Beanie', 'Accessories', '38.00', '2', '2026-02-23', 'PayPal'],
  ['INV-8817', 'Tailored Wool Blend Blazer', 'Formalwear', '220.00', '1', '2026-02-24', 'Stripe Card'],
  ['INV-8818', 'Flannel-Lined Utility Work Pants', 'Workwear', '110.00', '1', '2026-02-25', 'Apple Pay'],
  ['INV-8819', 'Technical Performance Joggers', 'Athleisure', '85.00', '2', '2026-02-26', 'Shop Pay'],
  ['INV-8820', 'Slim-Fit Selvedge Jeans', 'Denim', '128.00', '1', '2026-02-27', 'Stripe Card'],
  ['INV-8821', 'Heavyweight French Terry Hoodie', 'Sweatshirts', '95.00', '1', '2026-02-28', 'Apple Pay'],
  ['INV-8822', 'Multi-Pocket Tactical Cargo Shorts', 'Shorts', '65.00', '1', '2026-03-01', 'PayPal'],
  ['INV-8823', 'Relaxed Corduroy Overshirt', 'Tops', '88.00', '1', '2026-03-02', 'Stripe Card'],
  ['INV-8824', 'Waterproof Commuter Parka', 'Outerwear', '245.00', '1', '2026-03-03', 'Shop Pay'],
];

// 3. SaaS Cloud Subscriptions (Unique columns: Client Account, Subscription Tier, Billing Frequency, Contract MRR, Licensed Seats, Renewal Date, Payment Gateway)
const saasHeaders = ['Client Account', 'Subscription Tier', 'Billing Frequency', 'Contract MRR', 'Licensed Seats', 'Renewal Date', 'Payment Gateway'];
const saasRows: string[][] = [
  ['Stripe Labs Inc', 'Enterprise Cloud Tier', 'Annual Pre-paid', '850.00', '50', '2026-09-01', 'Wire Transfer'],
  ['Vercel Media UK', 'Business Scale Tier', 'Monthly Recurring', '249.00', '15', '2026-04-01', 'Credit Card'],
  ['Figma Studios', 'Enterprise Cloud Tier', 'Annual Pre-paid', '850.00', '60', '2026-10-15', 'Wire Transfer'],
  ['Linear Software', 'Startup Team Plan', 'Monthly Recurring', '99.00', '8', '2026-04-05', 'Credit Card'],
  ['Raycast Tools', 'Developer Solo Seat', 'Monthly Recurring', '35.00', '2', '2026-04-10', 'PayPal'],
  ['Notion Global', 'Enterprise Cloud Tier', 'Annual Pre-paid', '850.00', '80', '2026-11-01', 'Wire Transfer'],
  ['Datadog Systems', 'Business Scale Tier', 'Monthly Recurring', '249.00', '20', '2026-04-12', 'ACH Debit'],
  ['Supabase Core', 'Startup Team Plan', 'Monthly Recurring', '99.00', '10', '2026-04-15', 'Credit Card'],
  ['Resend Email API', 'Developer Solo Seat', 'Annual Pre-paid', '35.00', '1', '2027-01-01', 'Credit Card'],
  ['Retool Apps', 'Business Scale Tier', 'Monthly Recurring', '249.00', '18', '2026-04-18', 'ACH Debit'],
  ['PostHog Analytics', 'Enterprise Cloud Tier', 'Annual Pre-paid', '850.00', '45', '2026-12-01', 'Wire Transfer'],
  ['Render Cloud Host', 'Startup Team Plan', 'Monthly Recurring', '99.00', '6', '2026-04-20', 'Credit Card'],
  ['Pinecone Vector', 'Business Scale Tier', 'Monthly Recurring', '249.00', '16', '2026-04-22', 'Credit Card'],
  ['Midjourney AI', 'Enterprise Cloud Tier', 'Annual Pre-paid', '850.00', '100', '2026-12-15', 'Wire Transfer'],
  ['Cursor Editor', 'Startup Team Plan', 'Monthly Recurring', '99.00', '12', '2026-04-25', 'Credit Card'],
  ['PlanetScale DB', 'Developer Solo Seat', 'Monthly Recurring', '35.00', '3', '2026-04-28', 'PayPal'],
  ['Sentry Error Log', 'Business Scale Tier', 'Monthly Recurring', '249.00', '22', '2026-04-30', 'ACH Debit'],
  ['Neon Postgres', 'Enterprise Cloud Tier', 'Annual Pre-paid', '850.00', '55', '2027-01-15', 'Wire Transfer'],
];

// 4. IT Hardware Procurement (Unique columns: Asset Tag, Hardware Item, Department Allocation, Unit Cost, Vendor Supplier, Procurement Date, Approval Status)
const hardwareHeaders = ['Asset Tag', 'Hardware Item', 'Department Allocation', 'Unit Cost', 'Vendor Supplier', 'Procurement Date', 'Approval Status'];
const hardwareRows: string[][] = [
  ['AST-401', 'Apple MacBook Pro 16" M3 Max', 'Engineering', '3499.00', 'Apple Enterprise', '2026-01-10', 'Approved'],
  ['AST-402', 'Dell UltraSharp 32" 4K Monitor', 'Design Studio', '799.00', 'Dell Direct', '2026-01-12', 'Approved'],
  ['AST-403', 'Herman Miller Aeron Chair', 'Operations', '1450.00', 'Design Within Reach', '2026-01-15', 'Approved'],
  ['AST-404', 'Sony WH-1000XM5 Headset', 'Product Management', '399.00', 'B&H Photo Video', '2026-01-18', 'Approved'],
  ['AST-405', 'Keychron Q1 Pro Mechanical Keyboard', 'Engineering', '210.00', 'Keychron Global', '2026-01-20', 'Approved'],
  ['AST-406', 'CalDigit TS4 Thunderbolt Dock', 'Design Studio', '399.00', 'CalDigit US', '2026-01-22', 'Approved'],
  ['AST-407', 'Apple MacBook Air 15" M3', 'Sales & Marketing', '1499.00', 'Apple Enterprise', '2026-01-25', 'Approved'],
  ['AST-408', 'Logitech MX Master 3S Mouse', 'Engineering', '99.00', 'CDW Government', '2026-01-28', 'Approved'],
  ['AST-409', 'Dell UltraSharp 32" 4K Monitor', 'Engineering', '799.00', 'Dell Direct', '2026-02-02', 'Approved'],
  ['AST-410', 'Apple MacBook Pro 16" M3 Max', 'AI Research', '3499.00', 'Apple Enterprise', '2026-02-05', 'Approved'],
  ['AST-411', 'Herman Miller Aeron Chair', 'Engineering', '1450.00', 'Design Within Reach', '2026-02-08', 'Approved'],
  ['AST-412', 'Elgato Facecam Pro 4K', 'Executive Suite', '299.00', 'Amazon Business', '2026-02-12', 'Approved'],
  ['AST-413', 'Sony WH-1000XM5 Headset', 'Design Studio', '399.00', 'B&H Photo Video', '2026-02-15', 'Approved'],
  ['AST-414', 'Jarvis Motorized Standing Desk', 'Operations', '899.00', 'Fully Workspaces', '2026-02-18', 'Approved'],
  ['AST-415', 'Apple MacBook Air 15" M3', 'Product Management', '1499.00', 'Apple Enterprise', '2026-02-22', 'Approved'],
  ['AST-416', 'CalDigit TS4 Thunderbolt Dock', 'Engineering', '399.00', 'CalDigit US', '2026-02-25', 'Approved'],
  ['AST-417', 'Dell UltraSharp 32" 4K Monitor', 'Sales & Marketing', '799.00', 'Dell Direct', '2026-03-01', 'Approved'],
  ['AST-418', 'Keychron Q1 Pro Mechanical Keyboard', 'AI Research', '210.00', 'Keychron Global', '2026-03-04', 'Approved'],
  ['AST-419', 'Apple MacBook Pro 16" M3 Max', 'Engineering', '3499.00', 'Apple Enterprise', '2026-03-08', 'Approved'],
  ['AST-420', 'Logitech MX Master 3S Mouse', 'Executive Suite', '99.00', 'CDW Government', '2026-03-12', 'Approved'],
];

// 5. Fitness Studio Memberships (Unique columns: Member ID, Membership Package, Access Tier, Monthly Fee, Assigned Trainer, Join Date, Auto-Renew)
const fitnessHeaders = ['Member ID', 'Membership Package', 'Access Tier', 'Monthly Fee', 'Assigned Trainer', 'Join Date', 'Auto-Renew'];
const fitnessRows: string[][] = [
  ['MEM-901', 'All-Access Annual VIP', '24/7 All-Locations', '1188.00', 'Elena Rostova', '2026-02-01', 'Yes'],
  ['MEM-902', 'Monthly Unlimited Gym', 'Single Club Peak', '129.00', 'Marcus Vance', '2026-02-01', 'Yes'],
  ['MEM-903', 'Personal Training 10-Pack', 'VIP Personal Coaching', '850.00', 'Elena Rostova', '2026-02-02', 'No'],
  ['MEM-904', 'Hot Yoga & Pilates Pass', 'Studio Classes Only', '95.00', 'Sophia Chen', '2026-02-03', 'Yes'],
  ['MEM-905', 'Recovery Spa & Sauna Club', 'Wellness Addon', '49.00', 'Staff Wellness', '2026-02-04', 'Yes'],
  ['MEM-906', 'Monthly Unlimited Gym', 'Single Club Peak', '129.00', 'Marcus Vance', '2026-02-05', 'Yes'],
  ['MEM-907', 'Smoothie Bar & Hydration', 'Nutrition Club', '65.00', 'Nutrition Bar', '2026-02-06', 'Yes'],
  ['MEM-908', 'All-Access Annual VIP', '24/7 All-Locations', '1188.00', 'Elena Rostova', '2026-02-08', 'Yes'],
  ['MEM-909', 'Personal Training 5-Pack', 'VIP Personal Coaching', '450.00', 'David Miller', '2026-02-10', 'No'],
  ['MEM-910', 'Monthly Unlimited Gym', 'Single Club Peak', '129.00', 'Marcus Vance', '2026-02-12', 'Yes'],
  ['MEM-911', 'Hot Yoga & Pilates Pass', 'Studio Classes Only', '95.00', 'Sophia Chen', '2026-02-14', 'Yes'],
  ['MEM-912', 'Personal Training 10-Pack', 'VIP Personal Coaching', '850.00', 'David Miller', '2026-02-16', 'No'],
  ['MEM-913', 'All-Access Annual VIP', '24/7 All-Locations', '1188.00', 'Elena Rostova', '2026-02-18', 'Yes'],
  ['MEM-914', 'Monthly Unlimited Gym', 'Single Club Peak', '129.00', 'Marcus Vance', '2026-02-20', 'Yes'],
  ['MEM-915', 'Recovery Spa & Sauna Club', 'Wellness Addon', '49.00', 'Staff Wellness', '2026-02-22', 'Yes'],
  ['MEM-916', 'Personal Training 5-Pack', 'VIP Personal Coaching', '450.00', 'David Miller', '2026-02-24', 'No'],
  ['MEM-917', 'Monthly Unlimited Gym', 'Single Club Peak', '129.00', 'Marcus Vance', '2026-02-26', 'Yes'],
  ['MEM-918', 'Smoothie Bar & Hydration', 'Nutrition Club', '65.00', 'Nutrition Bar', '2026-02-27', 'Yes'],
  ['MEM-919', 'All-Access Annual VIP', '24/7 All-Locations', '1188.00', 'Elena Rostova', '2026-02-28', 'Yes'],
  ['MEM-920', 'Hot Yoga & Pilates Pass', 'Studio Classes Only', '95.00', 'Sophia Chen', '2026-03-02', 'Yes'],
];

export const DEMO_SHEETS: DemoSheet[] = [
  {
    id: 'coffee-pos',
    title: 'Artisan Coffee Shop & Bakery POS',
    subtitle: 'Daily register register receipts, specialty brews, and bakery items',
    category: 'POS & Dining',
    fileFormat: 'XLSX',
    fileName: 'greenhouse_coffee_pos_q1.xlsx',
    iconName: 'coffee',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    rowCount: coffeeRows.length,
    columnCount: coffeeHeaders.length,
    totalVolumeEst: '$203.45',
    headers: coffeeHeaders,
    rows: coffeeRows,
  },
  {
    id: 'apparel-retail',
    title: 'Fashion & Streetwear E-Commerce',
    subtitle: 'Multi-category apparel orders spanning denim, chinos, outerwear, and accessories',
    category: 'Retail & E-Commerce',
    fileFormat: 'CSV',
    fileName: 'streetwear_ecom_orders.csv',
    iconName: 'shopping-bag',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    rowCount: apparelRows.length,
    columnCount: apparelHeaders.length,
    totalVolumeEst: '$2,997.00',
    headers: apparelHeaders,
    rows: apparelRows,
  },
  {
    id: 'saas-mrr',
    title: 'B2B SaaS Subscriptions & Recurring MRR',
    subtitle: 'Cloud software tiers across Solo, Startup, Scale, and Enterprise licensing',
    category: 'SaaS & Subscriptions',
    fileFormat: 'XLSX',
    fileName: 'saas_cloud_subscriptions_2026.xlsx',
    iconName: 'cloud',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    rowCount: saasRows.length,
    columnCount: saasHeaders.length,
    totalVolumeEst: '$7,294.00',
    headers: saasHeaders,
    rows: saasRows,
  },
  {
    id: 'hardware-procurement',
    title: 'Tech Startup IT Hardware Procurement',
    subtitle: 'High-ticket engineering laptops, 4K monitors, ergonomic furniture, and audio gear',
    category: 'Procurement & Assets',
    fileFormat: 'XLSX',
    fileName: 'q1_hardware_procurement.xlsx',
    iconName: 'laptop',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    rowCount: hardwareRows.length,
    columnCount: hardwareHeaders.length,
    totalVolumeEst: '$22,540.00',
    headers: hardwareHeaders,
    rows: hardwareRows,
  },
  {
    id: 'gym-memberships',
    title: 'Boutique Fitness Studio & Gym Memberships',
    subtitle: 'Annual VIP passes, 10-class packs, monthly recurring dues, and recovery addons',
    category: 'Memberships & Wellness',
    fileFormat: 'CSV',
    fileName: 'fitness_studio_memberships.csv',
    iconName: 'dumbbell',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    rowCount: fitnessRows.length,
    columnCount: fitnessHeaders.length,
    totalVolumeEst: '$8,339.00',
    headers: fitnessHeaders,
    rows: fitnessRows,
  },
];
