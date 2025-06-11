"use server";

import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { credit_logs } from "@/lib/schema"

// Server action to get or create a user from Clerk
export async function getOrCreateUser() {
  console.log('USER_ACTIONS: getOrCreateUser called');
  try {
    console.log('USER_ACTIONS: Attempting to get userId from auth');
    const { userId } = await auth();
    console.log('USER_ACTIONS: userId from auth:', userId);

    if (!userId) {
      console.error('USER_ACTIONS: Unauthorized - userId is missing from auth');
      return {
        success: false,
        error: "Unauthorized: Missing Clerk user ID.",
      };
    }

    // Check if the user already exists in the database
    console.log('USER_ACTIONS: Checking for existing user in DB with userId:', userId);
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    console.log('USER_ACTIONS: Existing user query result:', existingUser);

    if (existingUser.length > 0) {
      console.log('USER_ACTIONS: Existing user found:', existingUser[0]);
      return {
        success: true,
        data: existingUser[0],
      };
    }

    // Fetch user details from Clerk
    console.log('USER_ACTIONS: No existing user found. Fetching user details from Clerk for userId:', userId);
    const clerkUser = await currentUser();
    console.log('USER_ACTIONS: Clerk user details:', clerkUser);

    if (!clerkUser) {
      console.error('USER_ACTIONS: Clerk user not found for userId:', userId);
      return {
        success: false,
        error: "Clerk user not found.",
      };
    }

    // Determine the primary email address and its verification status
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    );

    const isEmailVerified =
      primaryEmail?.verification?.status === "verified";

    // Insert the new user into the database
    console.log('USER_ACTIONS: Creating new user in DB with userId:', userId, 'and Clerk user details:', clerkUser);
    const newUser = await db
      .insert(users)
      .values({
        id: userId,
        name: clerkUser.firstName || "",
        email: primaryEmail?.emailAddress || "",
        email_verified: isEmailVerified ?? false,
        image_url: clerkUser.imageUrl || "",
        role: "user",
        preferences: {},
        credits_remaining: 100, // Initialize credits for new user
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    console.log('USER_ACTIONS: New user created successfully:', newUser[0]);
    return {
      success: true,
      data: newUser[0],
    };
  } catch (err) {
    console.error("USER_ACTIONS: Error in getOrCreateUser for userId: " + (auth().userId || 'unknown') + ", error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unknown error occurred while creating user.",
    };
  }
}


type CreditAction = "generate_post" | "generate_image"

export async function deductCredit(
  userId: string,
  creditsToUse: number = 1,
  action: CreditAction
) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user || user.credits_remaining < creditsToUse) {
    throw new Error("Out of credits")
  }

  await db
    .update(users)
    .set({ credits_remaining: user.credits_remaining - creditsToUse })
    .where(eq(users.id, userId))

  await db.insert(credit_logs).values({
    user_id: userId,
    action,
    credits_used: creditsToUse,
    timestamp: new Date(),
  })
}