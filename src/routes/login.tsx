import { Button } from '@/components/ui/button'
import { signIn } from '@/lib/auth-client';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
    component: RouteComponent,
})

function RouteComponent() {
    const handleLogin = async () => {
        await signIn.social({
            provider: "google",
        })
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="w-full max-w-md px-6">
                <h1 className="text-3xl font-semibold text-center mb-8">
                    Sign in to your account
                </h1>

                <Button
                    className="w-full h-11 rounded-lg font-medium shadow-lg transition-all"
                    onClick={handleLogin}
                >
                    Sign in
                </Button>
            </div>
        </div>
    )
}
