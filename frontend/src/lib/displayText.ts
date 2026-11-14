// Older seed strings contain UTF-8 bytes decoded as DOS CP437 (and sometimes
// Windows-1252). Decode only complete, valid byte sequences; keep other text.
const cp437 = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
const byteMap = (characters: string) => new Map(Array.from(characters, (character, index) => [character, index + 128]));
const oemBytes = byteMap(cp437);
const windowsBytes = byteMap(new TextDecoder('windows-1252').decode(Uint8Array.from({ length: 128 }, (_, index) => index + 128)));
const utf8 = new TextDecoder('utf-8', { fatal: true });

function decodeSequences(value: string, bytes: Map<string, number>): string {
  const characters = Array.from(value);
  let result = '';
  for (let index = 0; index < characters.length; index++) {
    const lead = bytes.get(characters[index]) ?? 0;
    const length = lead >= 0xc2 && lead <= 0xdf ? 2 : lead >= 0xe0 && lead <= 0xef ? 3 : lead >= 0xf0 && lead <= 0xf4 ? 4 : 0;
    const sequence = characters.slice(index, index + length).map(character => bytes.get(character) ?? -1);
    if (length && sequence.length === length && sequence.slice(1).every(byte => byte >= 0x80 && byte <= 0xbf)) {
      try {
        result += utf8.decode(new Uint8Array(sequence));
        index += length - 1;
        continue;
      } catch { /* Incomplete or invalid UTF-8 must remain unchanged. */ }
    }
    result += characters[index];
  }
  return result;
}

export function repairDisplayText(value: string): string {
  let text = value;
  for (let pass = 0; pass < 3; pass++) {
    const previous = text;
    if (/[\u2500-\u259f]/.test(text)) text = decodeSequences(text, oemBytes);
    text = decodeSequences(text, windowsBytes);
    if (text === previous) break;
  }
  return text;
}

const displayFields = new Set([
  'name', 'fullName', 'full_name', 'description', 'subtitle', 'badge', 'unit',
  'size', 'sizes', 'sugar', 'ice', 'topping', 'productNameAtTime', 'product_name_at_time', 'ingredientName', 'ingredient_name',
  'recipientName', 'recipient_name', 'address', 'deliveryAddress', 'delivery_address',
  'note', 'orderNote', 'order_note', 'paymentNote', 'cancelReason', 'reason',
  'reviewNote', 'itemNote', 'handoverNote', 'content', 'response', 'reply',
  'settingValue', 'setting_value', 'message'
]);

// Restrict repair to display fields. IDs, tokens, URLs and stored image bytes
// must pass through untouched. This produces new objects, never mutates input.
export function repairDisplayData<T>(value: T, field = ''): T {
  if (typeof value === 'string') return (displayFields.has(field) ? repairDisplayText(value) : value) as T;
  if (Array.isArray(value)) return value.map(item => repairDisplayData(item, field)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      field === 'sizes' ? repairDisplayText(key) : key,
      repairDisplayData(item, key)
    ])) as T;
  }
  return value;
}
