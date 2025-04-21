// Test script for image generation with image_service parameter
// Run this using "node test-image-generation.js"

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

async function testImageGeneration() {
  // Test parameters
  const postId = 12; // Change to an actual post ID in your database
  const numImages = 1;
  const imageStyle = "anime";
  const imageService = "gemini"; // Test the new image_service parameter

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  
  // Construct the API URL with all parameters
  const apiUrl = new URL(`/api/posts/${postId}/generate-images`, baseUrl);
  apiUrl.searchParams.append('num_images', numImages.toString());
  apiUrl.searchParams.append('style', imageStyle);
  apiUrl.searchParams.append('image_service', imageService);
  
  console.log(`Testing image generation API with URL: ${apiUrl.toString()}`);
  
  try {
    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // Add cache: 'no-store' to prevent caching issues
      cache: 'no-store'
    });
    
    console.log(`Response status: ${response.status}`);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Test passed: API returned success response');
      console.log(`Status: ${data.data?.status || 'unknown'}`);
      console.log(`Message: ${data.data?.message || 'No message'}`);
      
      if (data.data?.images) {
        console.log(`Images generated: ${data.data.images.length}`);
      }
    } else {
      console.log('❌ Test failed: API returned error');
      console.log(`Error: ${data.error || 'Unknown error'}`);
      console.log(`Details: ${data.details || 'No details provided'}`);
    }
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
  }
}

testImageGeneration().catch(console.error);
