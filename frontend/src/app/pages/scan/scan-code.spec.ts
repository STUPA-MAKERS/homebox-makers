import { parseHomeboxCode } from './scan.component';

const ID = '938a1f91-ef8c-45a7-9c41-f15146334008';

/** §F/scanner/codes/000050 */
describe('parseHomeboxCode_urls', () => {
  it('resolves the URL or the path of a label to its entity', () => {
    for (const code of [
      `https://hb.example.org/item/${ID}`,
      `https://hb.example.org/items/${ID}/`,
      `/location/${ID}`,
      `/locations/${ID}`,
    ]) {
      expect(parseHomeboxCode(code)).toEqual({ kind: 'entity', id: ID });
    }
  });

  it('resolves an asset path through the asset id', () => {
    expect(parseHomeboxCode('https://hb.example.org/a/MK-0004')).toEqual({
      kind: 'asset',
      assetId: 'MK-0004',
    });
  });

  it('ignores a URL of a different page', () => {
    expect(parseHomeboxCode('https://example.org/shop/123')).toBeNull();
  });
});

/** §F/scanner/codes/000051 */
describe('parseHomeboxCode_assetIds', () => {
  it('accepts an asset id as printed or typed', () => {
    for (const [code, assetId] of [
      ['000-123', '000-123'],
      ['MK-0004', 'MK-0004'],
      ['#MK-0004', 'MK-0004'],
      ['123', '123'],
    ]) {
      expect(parseHomeboxCode(code)).toEqual({ kind: 'asset', assetId });
    }
  });

  it('leaves a different barcode to the search', () => {
    expect(parseHomeboxCode('4006381333931x')).toBeNull();
  });
});
