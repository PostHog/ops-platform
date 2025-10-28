import { createMiddleware } from "@tanstack/react-start";
import { auth } from "./auth";
import { getRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
    let user = null

    try {
        const request = getRequest()
        
        const session = await auth.api.getSession({
            headers: request.headers
        })

        if (session?.user) {
            user = {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
            }
        }
    } catch (error) {
        console.error('❌ Auth middleware error:', error)
    }

    if (!user) {
        throw redirect({ to: '/login' })
    }

    return await next({
        context: { user }
    })
})