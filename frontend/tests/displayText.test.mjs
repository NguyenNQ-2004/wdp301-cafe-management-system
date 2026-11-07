import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let vite, text, api;
before(async () => {
  vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  text = await vite.ssrLoadModule('/src/lib/displayText.ts');
  api = await vite.ssrLoadModule('/src/lib/shopApi.ts');
});
after(async () => { await vite?.close(); });

test('repairs actual legacy product names, subtitles and both encoding variants', () => {
  const samples = [
    ['C├á Ph├¬ Muß╗æi Aura ─Éß║╖c Biß╗çt', 'Cà Phê Muối Aura Đặc Biệt'],
    ['Phin Cß╗ò ─Éiß╗ân', 'Phin Cổ Điển'],
    ['Caramel Macchiato ─Éß║╖c Sß║ún', 'Caramel Macchiato Đặc Sản'],
    ['Tr├á ─É├áo Cam Sß║ú T╞░╞íi', 'Trà Đào Cam Sả Tươi'],
    ['B├üN CHß║áY', 'BÁN CHẠY'],
    ['M├ôN Mß╗ÜI', 'MÓN MỚI'],
    ['CÃ  PhÃª', 'Cà Phê'],
    ['Cà Phê và Tr├á ─É├áo', 'Cà Phê và Trà Đào']
  ];
  for (const [raw, expected] of samples) {
    assert.equal(text.repairDisplayText(raw), expected);
    assert.equal(text.repairDisplayText(expected), expected, 'repair is idempotent');
  }
});

test('keeps valid Vietnamese, emoji and incomplete byte sequences unchanged', () => {
  for (const value of ['Cà phê sữa đá Đặc Biệt', 'Trà Sen Vàng Long Nhãn', 'Latte Nghệ Thuật Hạt Phỉ', 'Crème brûlée ☕ 🧋', 'Tiếng Việt đúng', '├', 'Ã', '', 'BÁN CHẠY']) {
    assert.equal(text.repairDisplayText(value), value);
  }
});

test('repairs nested display data without changing identifiers, tokens or image URLs', () => {
  const input = { _id: 'CÃ ', token: 'CÃ ', imageUrl: 'https://example.com/CÃ .png', name: 'C├á Ph├¬', category: { name: 'Tr├á' }, items: [{ productNameAtTime: 'C├á Ph├¬' }], count: 3, optional: null };
  const output = text.repairDisplayData(input);
  assert.equal(output.name, 'Cà Phê'); assert.equal(output.category.name, 'Trà');
  assert.equal(output.items[0].productNameAtTime, 'Cà Phê');
  for (const key of ['_id', 'token', 'imageUrl', 'count', 'optional']) assert.equal(output[key], input[key]);
  assert.equal(input.name, 'C├á Ph├¬', 'original data is not mutated');
});

test('catalog API client returns readable names and descriptions to the frontend', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([{ _id: 'coffee', name: 'C├á Ph├¬', subtitle: 'Phin Cß╗ò ─Éiß╗ân', description: 'C├á ph├¬ sß╗»a ─æ├í' }]), { status: 200 });
  try {
    const [product] = await api.shopApi('/api/products');
    assert.equal(product.name, 'Cà Phê');
    assert.equal(product.subtitle, 'Phin Cổ Điển');
    assert.equal(product.description, 'Cà phê sữa đá');
  } finally { globalThis.fetch = original; }
});

test('legacy cart topping and repaired catalog name keep the same 8000 VND surcharge', () => {
  const product = { _id: 'coffee', name: 'Cà Phê Muối', basePrice: 45000, variantsConfig: { sizes: { M: 0, L: 10000 }, toppings: [{ name: 'Extra kem muß╗æi', price: 8000 }] } };
  const repaired = text.repairDisplayData(product);
  assert.equal(repaired.variantsConfig.toppings[0].name, 'Extra kem muối');
  for (const catalog of [product, repaired]) {
    for (const name of ['Extra kem muß╗æi', 'Extra kem muối']) {
      const line = api.productToCartItem(catalog, 'M', { topping: [name] });
      assert.equal(line.unitPrice, 53000);
      assert.equal(line.unitPrice + 18000 - 100 / 10 * 2000, 51000);
      assert.equal(api.cartPayload([line])[0].customization.topping[0], name);
    }
  }
  assert.equal(api.productToCartItem(repaired, 'L', { topping: ['Extra kem muß╗æi'] }).unitPrice, 63000);
});
