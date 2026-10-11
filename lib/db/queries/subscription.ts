"use server";

import type { DBResponse } from ".";
import type { Subscription } from "@/types/db";

import { db } from "..";
import { requireUser } from "../access";

/**
 * Get user subscription
 * @param userId User ID
 * @returns Subscription
 */
export async function getUserSubscription(
  userId: string
): Promise<DBResponse<Subscription | null>> {
  const user = await requireUser();
  if (user.id !== userId) throw new Error("Access denied.");
  try {
    const data = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.userId, userId),
    });

    return { data: data ?? null, error: null };
  } catch (error) {
    return { error: (error as Error).message, data: null };
  }
}
