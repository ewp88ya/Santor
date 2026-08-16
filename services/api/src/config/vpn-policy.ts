export const GENERAL_FREE_INFRASTRUCTURE_POLICY = {
  maxConcurrentUsers: 100,
  operatingWindowMinutes: 60,
  disconnectInactiveConnections: true,
  requireCapacityForReconnect: true,
} as const;

export function getDeviceLimit(productCode: string, databaseDeviceLimit: number): number {
  if (databaseDeviceLimit < 1) {
    throw new Error(`Invalid device limit for product ${productCode}`);
  }

  return databaseDeviceLimit;
}
