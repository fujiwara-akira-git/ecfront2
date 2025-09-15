// Minimal Freee integration helpers (TypeScript)
// Use the environment's global fetch (Node 18+, Next.js) to avoid node-fetch dependency.

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPriceTaxExcluded: number; // 税抜
  taxRate: number; // 0.10 or 0.08
};

export type OrderPayload = {
  id: string;
  shopId: string;
  amountSubtotal: number; // 税抜
  taxAmount: number;
  amountTotal: number; // 税込
  currency: 'JPY';
  items: OrderItem[];
  customer: { name?: string; email?: string; freee_partner_id?: string };
  createdAt: string;
};

const FREEE_API_BASE = process.env.FREEE_API_BASE || 'https://api.freee.co.jp';

function getAccessToken(): string | undefined {
  return process.env.FREEE_CLIENT_ACCESS_TOKEN;
}

export async function createVoucherForOrder(order: OrderPayload) {
  const token = getAccessToken();
  if (!token) throw new Error('FREEE_CLIENT_ACCESS_TOKEN not set');

  // Build a minimal voucher payload. This is a template — adjust per freee API.
  const lines = [] as any[];

  // 売上（税抜）を科目に流す
  lines.push({
    account_item_id: process.env.FREEE_SALES_ACCOUNT_ID || null,
    tax_code_id: null,
    amount: order.amountSubtotal,
    dc_type: 'credit',
    description: `Order ${order.id}`,
  });

  // 消費税行（簡略）
  if (order.taxAmount && order.taxAmount > 0) {
    lines.push({
      account_item_id: process.env.FREEE_TAX_ACCOUNT_ID || null,
      amount: order.taxAmount,
      dc_type: 'credit',
      description: `Consumption tax for ${order.id}`,
    });
  }

  // 対象の借方（受取勘定）
  lines.push({
    account_item_id: process.env.FREEE_RECEIVABLE_ACCOUNT_ID || null,
    amount: order.amountTotal,
    dc_type: 'debit',
    description: `Receivable for ${order.id}`,
  });

  const body = {
    company_id: Number(process.env.FREEE_COMPANY_ID || 0),
    issue_date: order.createdAt.slice(0, 10),
    details: lines,
    // memo / partner mapping etc can be added here
  };

  const res = await (globalThis.fetch as typeof fetch)(`${FREEE_API_BASE}/api/1/vouchers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`freee create voucher failed: ${res.status} ${txt}`);
  }

  return res.json();
}

export async function ensurePartner(customer: { name?: string; email?: string; freee_partner_id?: string }) {
  const token = getAccessToken();
  if (!token) throw new Error('FREEE_CLIENT_ACCESS_TOKEN not set');

  if (customer.freee_partner_id) return { id: customer.freee_partner_id };

  // Create partner (取引先) minimal implementation
  const payload = { name: customer.name || customer.email || 'Unknown' };
  const res = await (globalThis.fetch as typeof fetch)(`${FREEE_API_BASE}/api/1/partners`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`freee create partner failed: ${res.status}`);
  return res.json();
}

// Helper: convert税込 to 税抜 (if needed)
export function taxExcludedFromIncluded(amountIncluded: number, taxRate: number) {
  return Math.round((amountIncluded * 100) / (100 + taxRate * 100));
}
