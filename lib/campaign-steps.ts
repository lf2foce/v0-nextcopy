// Define step constants for clarity
export async function getCampaignSteps() {
  return {
    NEW: 0,
    GENERATE_THEME: 2, // Both theme steps combined as 2
    SELECT_THEME: 2, // Both theme steps combined as 2
    GENERATE_POST: 3, // Both post steps combined as 3
    APPROVE_POST: 3, // Both post steps combined as 3
    GENERATE_IMAGES: 4, // Updated from 5 to 4
    GENERATE_VIDEO: 5, // Updated from 6 to 5
    REVIEW: 6, // Updated from 7 to 6
    COMPLETION: 7, // Updated from 8 to 7
    SCHEDULED: 8, // Updated from 9 to 8
  }
}
