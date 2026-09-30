/**
 * Data-driven loyalty defaults for Accessible Publishers school purchases.
 * Keep in sync with frontend/src/constants/accessible.js.
 *
 * Snapshot comments (clean all-seasons, Aug 2026 — do not hardcode in UI):
 * 2,151 schools, ₦1,260,066,623 total; median ₦260,000; avg ₦585,805.
 */

const NAIRA_PER_POINT = 1000;
const GIFT_COST_PER_POINT = 30;
const GIFT_COST_RANGE = [20, 50];

const SPEND_SEGMENTS = [
  {
    id: 'occasional',
    label: 'Occasional',
    min: 0,
    max: 50000,
    tier: 'bronze',
    loyaltyRole: 'Low earn; keep cost of rewards tiny',
  },
  {
    id: 'small',
    label: 'Small',
    min: 50000,
    max: 200000,
    tier: 'bronze',
    loyaltyRole: 'Entry tier',
  },
  {
    id: 'core',
    label: 'Core',
    min: 200000,
    max: 500000,
    tier: 'silver',
    loyaltyRole: 'Volume of customers; median sits here',
  },
  {
    id: 'strong',
    label: 'Strong',
    min: 500000,
    max: 1000000,
    tier: 'gold',
    loyaltyRole: 'Solid repeat / grow into key',
  },
  {
    id: 'key',
    label: 'Key account',
    min: 1000000,
    max: 5000000,
    tier: 'platinum',
    loyaltyRole: 'Half of revenue — protect and reward',
  },
  {
    id: 'strategic',
    label: 'Strategic',
    min: 5000000,
    max: null,
    tier: 'diamond',
    loyaltyRole: 'White-glove; not the same gift as ₦50k buyers',
  },
];

const LOYALTY_TIERS = [
  { id: 'bronze', label: 'Bronze', from: 'Occasional + Small (< ₦200k)' },
  { id: 'silver', label: 'Silver', from: 'Core (₦200k–500k)' },
  { id: 'gold', label: 'Gold', from: 'Strong (₦500k–1m)' },
  { id: 'platinum', label: 'Platinum', from: 'Key (₦1m–5m)' },
  { id: 'diamond', label: 'Diamond', from: 'Strategic (₦5m+)' },
];

const GIFT_LADDER = [
  {
    points: 50,
    label: 'Jotter & pen',
    note: '~₦50k spend',
    examples: [
      'Branded jotter + pen set',
      'Exercise-book pack',
      'Desk notepad',
      'Ballpoint pen pack',
      'Wall calendar',
      'Sticky notes + highlighter set',
      'A4 notebook',
      'School lanyard + ID holder',
      'Custom keyholder',
      'Pencil case',
    ],
  },
  {
    points: 250,
    label: 'Flask / umbrella',
    note: '~median school',
    examples: [
      'Lunch flask',
      'Compact umbrella',
      '10,000mAh power bank',
      'Quality diary + pen',
      'Rechargeable torch',
      'Table clock',
      'Insulated food jar',
      'Branded tote bag',
      'Entry Bluetooth earbuds',
      'Desk organiser',
    ],
  },
  {
    points: 500,
    label: 'Kettle / backpack',
    note: '~₦500k spend',
    examples: [
      'Electric kettle',
      'Sandwich maker',
      'Rechargeable fan',
      'School backpack',
      'Dry iron',
      '20,000mAh power bank',
      'Bluetooth speaker',
      'Wall-clock radio',
      'Kitchen utensil set',
      'Rechargeable table lamp',
    ],
  },
  {
    points: 1000,
    label: 'Blender / fan',
    note: '~₦1m spend',
    examples: [
      'Table blender (Binatone / Scanfrost class)',
      'Standing fan',
      'Rice cooker',
      'Pressing iron + kettle',
      'Compact microwave',
      'Small air fryer',
      'Single-burner gas cooker',
      'Basic sewing machine',
      'Tabletop water dispenser',
      'Entry Android tablet',
    ],
  },
  {
    points: 5000,
    label: 'Phone / TV',
    note: '~₦5m spend',
    examples: [
      'Android phone (Infinix / Tecno range)',
      '32-inch LED TV',
      'Small fridge',
      'Microwave oven',
      'Entry laptop',
      'Semi-automatic washing machine',
      'Small chest freezer',
      'Home sound system',
      '4-burner gas cooker',
      'Compact generator',
    ],
  },
];

const spendToPoints = (amount, nairaPerPoint = NAIRA_PER_POINT) => {
  const rate = Number(nairaPerPoint) > 0 ? Number(nairaPerPoint) : NAIRA_PER_POINT;
  return Math.floor(Math.max(0, Number(amount) || 0) / rate);
};

const segmentForSpend = (amount) => {
  const n = Number(amount) || 0;
  for (const seg of SPEND_SEGMENTS) {
    const underMax = seg.max == null || n < seg.max;
    if (n >= seg.min && underMax) return seg;
  }
  return SPEND_SEGMENTS[SPEND_SEGMENTS.length - 1];
};

const tierForSegment = (segmentId) => {
  const seg = SPEND_SEGMENTS.find((s) => s.id === segmentId);
  const tierId = seg?.tier || 'bronze';
  return LOYALTY_TIERS.find((t) => t.id === tierId) || LOYALTY_TIERS[0];
};

const isLikelyBookshop = (name) =>
  /book\s*shop|bkshp|bks?hp|distributor|reseller|wholesale/i.test(
    String(name || '')
  );

module.exports = {
  NAIRA_PER_POINT,
  GIFT_COST_PER_POINT,
  GIFT_COST_RANGE,
  SPEND_SEGMENTS,
  LOYALTY_TIERS,
  GIFT_LADDER,
  spendToPoints,
  segmentForSpend,
  tierForSegment,
  isLikelyBookshop,
};
