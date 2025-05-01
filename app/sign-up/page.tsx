import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-yellow-50">
      <div className="w-full max-w-md p-8">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: "bg-black hover:bg-gray-800 text-white",
              card: "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
              headerTitle: "text-2xl font-bold text-center",
              headerSubtitle: "text-gray-600 text-center",
            },
          }}
        />
      </div>
    </div>
  )
}