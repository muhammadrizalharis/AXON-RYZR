/**
 * Recursively converts BigInt values to strings so responses can be
 * serialized to JSON (Prisma returns BigInt for byte counts).
 */
export function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) =>
      typeof val === 'bigint' ? val.toString() : val,
    ),
  );
}
