// Match legacy menu option names without rewriting stored catalog/cart data.
// Keep this byte repair compatible with frontend/src/lib/displayText.ts.
const cp437 = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
const map = text => new Map(Array.from(text, (character, index) => [character, index + 128]));
const oem = map(cp437);
const windows = map(new TextDecoder('windows-1252').decode(Uint8Array.from({ length: 128 }, (_, index) => index + 128)));
const utf8 = new TextDecoder('utf-8', { fatal: true });
function decode(value, bytes) {
  const characters = Array.from(value);
  let text = '';
  for (let index = 0; index < characters.length; index++) {
    const lead = bytes.get(characters[index]) ?? 0;
    const length = lead >= 0xc2 && lead <= 0xdf ? 2 : lead >= 0xe0 && lead <= 0xef ? 3 : lead >= 0xf0 && lead <= 0xf4 ? 4 : 0;
    const sequence = characters.slice(index, index + length).map(character => bytes.get(character) ?? -1);
    if (length && sequence.length === length && sequence.slice(1).every(byte => byte >= 0x80 && byte <= 0xbf)) {
      try { text += utf8.decode(new Uint8Array(sequence)); index += length - 1; continue; } catch (_) { /* Preserve invalid sequences. */ }
    }
    text += characters[index];
  }
  return text;
}
function optionText(value) {
  let text = value;
  for (let pass = 0; pass < 3; pass++) {
    const previous = text;
    if (/[\u2500-\u259f]/.test(text)) text = decode(text, oem);
    text = decode(text, windows);
    if (text === previous) break;
  }
  return text;
}
module.exports = { optionText };
