import { serializeBigInt } from './serialize';

describe('serializeBigInt', () => {
  it('converts BigInt values to strings', () => {
    const output = serializeBigInt({
      size: BigInt(42),
      nested: { total: BigInt(100) },
    });
    expect(output.size).toBe('42');
    expect(output.nested.total).toBe('100');
  });

  it('leaves plain values untouched', () => {
    const input = { name: 'axon', count: 3, ok: true };
    expect(serializeBigInt(input)).toEqual(input);
  });

  it('handles arrays containing BigInt', () => {
    expect(serializeBigInt([BigInt(1), BigInt(2)])).toEqual(['1', '2']);
  });
});
