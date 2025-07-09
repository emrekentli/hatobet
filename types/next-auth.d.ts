import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    username?: string
  }
  
  interface Session {
    user: {
      id: string
      email: string
      name?: string
      username?: string
      role?: string
      image?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    username?: string
  }
} 