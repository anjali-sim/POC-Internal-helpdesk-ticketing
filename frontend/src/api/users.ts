import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';
import { userSchema, type User } from '@/types/ticket';

const agentsResponseSchema = z.object({ agents: z.array(userSchema) });

/** Agent only server-side -- requesters have no reason to enumerate staff. */
export async function listAgents(): Promise<User[]> {
  const { agents } = await apiRequest('/users/agents', agentsResponseSchema);
  return agents;
}
