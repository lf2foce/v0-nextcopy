"use server";

import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

// Server action to get or create a user from Clerk
export async function getOrCreateUser() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized: Missing Clerk user ID.",
      };
    }

    // Check if the user already exists in the database
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (existingUser.length > 0) {
      return {
        success: true,
        data: existingUser[0],
      };
    }

    // Fetch user details from Clerk
    const clerkUser = await currentUser();

    if (!clerkUser) {
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
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    return {
      success: true,
      data: newUser[0],
    };
  } catch (err) {
    console.error("getOrCreateUser error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unknown error occurred while creating user.",
    };
  }
}
