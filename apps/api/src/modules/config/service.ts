import type { UpdateSystemConfigInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';

const SINGLETON = 'singleton';

/** Read (creating defaults on first access) the singleton system config. */
export async function getConfig() {
  return prisma.systemConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON },
    update: {},
  });
}

export async function updateConfig(input: UpdateSystemConfigInput) {
  return prisma.systemConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, ...input },
    update: input,
  });
}
