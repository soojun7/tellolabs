import { prisma } from "@/lib/prisma";

export async function ensureUser(userId: string) {
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name: clerkUser.firstName || email.split("@")[0],
        credits: 100,
      },
    });
  }
  return user;
}
