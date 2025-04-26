"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function ApiTestPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    async function testApi() {
      try {
        const response = await fetch("/api/test-openai")
        const data = await response.json()

        if (data.success) {
          setStatus("success")
          setMessage(data.message)
          setDetails(data)
        } else {
          setStatus("error")
          setMessage(data.error)
          setDetails(data.details)
        }
      } catch (error) {
        setStatus("error")
        setMessage("Failed to test API: " + (error instanceof Error ? error.message : String(error)))
      }
    }

    testApi()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-black mb-6">OpenAI API Test</h1>

      <div className="border-4 border-black rounded-md p-6 bg-white">
        {status === "loading" && (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin" size={24} />
            <p>Testing OpenAI API connection...</p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="bg-green-100 border-4 border-black rounded-md p-4 mb-4">
              <h2 className="text-xl font-bold text-green-800">✅ API Connection Successful</h2>
              <p className="mt-2">{message}</p>
            </div>

            {details?.models && (
              <div className="mt-4">
                <h3 className="font-bold mb-2">Available Models:</h3>
                <ul className="list-disc pl-5">
                  {details.models.map((model: string) => (
                    <li key={model}>{model}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-bold mb-2">Next Steps:</h3>
              <p>
                Your OpenAI API key is working correctly. You can now use the AI Generate button in the campaign
                description field.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div>
            <div className="bg-red-100 border-4 border-black rounded-md p-4 mb-4">
              <h2 className="text-xl font-bold text-red-800">❌ API Connection Failed</h2>
              <p className="mt-2">{message}</p>
            </div>

            {details && (
              <div className="mt-4 overflow-auto max-h-60 p-4 bg-gray-100 rounded-md">
                <pre className="text-sm">{JSON.stringify(details, null, 2)}</pre>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <h3 className="font-bold">Troubleshooting Steps:</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Verify that you've added the <code className="bg-gray-100 px-1 py-0.5 rounded">OPENAI_API_KEY</code>{" "}
                  to your environment variables.
                </li>
                <li>Check that your API key is valid and has not expired.</li>
                <li>Ensure your OpenAI account has sufficient credits.</li>
                <li>Restart your development server after adding the environment variable.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <a
          href="/"
          className="inline-block py-2 px-4 bg-yellow-300 border-4 border-black rounded-md font-bold hover:bg-yellow-400 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          Back to Home
        </a>
      </div>
    </div>
  )
}
