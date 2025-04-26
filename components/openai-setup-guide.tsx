export function OpenAISetupGuide() {
  return (
    <div className="p-6 border-4 border-black rounded-md bg-gradient-to-r from-purple-100 to-pink-100">
      <h2 className="text-2xl font-black mb-4">OpenAI API Key Setup</h2>

      <div className="space-y-4">
        <p className="font-medium">
          To use the AI generation features, you need to set up your OpenAI API key as an environment variable.
        </p>

        <div className="bg-black text-white p-4 rounded-md font-mono text-sm overflow-x-auto">
          <p>OPENAI_API_KEY=sk-your-api-key-here</p>
        </div>

        <h3 className="text-lg font-bold mt-4">Setup Instructions:</h3>

        <ol className="list-decimal list-inside space-y-2">
          <li>
            Create or log in to your account at{" "}
            <a
              href="https://platform.openai.com"
              className="text-purple-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenAI Platform
            </a>
          </li>
          <li>Navigate to the API keys section</li>
          <li>Create a new secret key</li>
          <li>Copy the key (you'll only see it once!)</li>
          <li>
            Add it to your <code className="bg-gray-200 px-1 rounded">.env.local</code> file in your project root
          </li>
          <li>Restart your development server</li>
        </ol>

        <div className="bg-yellow-100 p-4 rounded-md mt-4 border-2 border-yellow-400">
          <p className="font-bold">Important:</p>
          <p>
            Never commit your API key to version control. Always use environment variables for sensitive information.
          </p>
        </div>
      </div>
    </div>
  )
}
