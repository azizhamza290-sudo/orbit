/**
 * Orbit — database seed.
 *
 * Creates a demo workspace with channels, members and a realistic
 * message history so you can explore the UI immediately.
 *
 *   npx prisma db seed
 *
 * Demo logins (password: `password123`):
 *   ava@orbit.dev  (owner)
 *   liam@orbit.dev (admin)
 *   mia@orbit.dev  (member)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Orbit demo data…");

  const passwordHash = await bcrypt.hash("password123", 12);

  const [ava, liam, mia, noah] = await Promise.all(
    [
      { name: "Ava Chen", email: "ava@orbit.dev" },
      { name: "Liam Patel", email: "liam@orbit.dev" },
      { name: "Mia Rossi", email: "mia@orbit.dev" },
      { name: "Noah Kim", email: "noah@orbit.dev" },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash, emailVerified: new Date() },
      }),
    ),
  );

  const workspace = await prisma.workspace.upsert({
    where: { slug: "orbit-hq" },
    update: {},
    create: {
      name: "Orbit HQ",
      slug: "orbit-hq",
      description: "The demo workspace — poke around, everything works.",
      ownerId: ava.id,
      members: {
        create: [
          { userId: ava.id, role: "OWNER" },
          { userId: liam.id, role: "ADMIN" },
          { userId: mia.id, role: "MEMBER" },
          { userId: noah.id, role: "MEMBER" },
        ],
      },
    },
  });

  const general = await prisma.channel.create({
    data: {
      workspaceId: workspace.id,
      name: "general",
      topic: "Company-wide announcements and water-cooler chat",
      description: "Everyone is here. Be nice.",
      createdById: ava.id,
      members: {
        create: [ava, liam, mia, noah].map((u) => ({ userId: u.id })),
      },
    },
  });

  const random = await prisma.channel.create({
    data: {
      workspaceId: workspace.id,
      name: "random",
      topic: "Off-topic. Cats welcome.",
      createdById: ava.id,
      members: { create: [ava, liam, mia, noah].map((u) => ({ userId: u.id })) },
    },
  });

  const engineering = await prisma.channel.create({
    data: {
      workspaceId: workspace.id,
      name: "engineering",
      topic: "Ship it 🚀",
      description: "Build logs, code review and architecture talk.",
      createdById: liam.id,
      members: { create: [ava, liam, noah].map((u) => ({ userId: u.id })) },
    },
  });

  const messages: Array<[string, string, string]> = [
    [general.id, ava.id, "Welcome to **Orbit HQ**! 🎉 This workspace is seeded so you can try everything."],
    [general.id, liam.id, "Threads, reactions, pins, file uploads — all live. Hover a message to try them."],
    [general.id, mia.id, "Try mentioning someone with `@` — notifications are realtime ⚡"],
    [general.id, noah.id, "```ts\nconst hello = (name: string) => `Hello, ${name}!`;\n```\nMarkdown and code blocks work too."],
    [random.id, mia.id, "Friday playlist thread? 🎧"],
    [random.id, ava.id, "Always. Drop your links below 👇"],
    [engineering.id, liam.id, "Deployed `v1.0.0` to Vercel — build time down 32% after enabling ISR."],
    [engineering.id, noah.id, "Nice! Did the Prisma connection pooling fix land as well?"],
    [engineering.id, liam.id, "Yes — using `POSTGRES_PRISMA_URL` with pgbouncer now. No more `too many connections`."],
  ];

  for (const [channelId, authorId, content] of messages) {
    await prisma.message.create({ data: { channelId, authorId, content } });
  }

  // A DM between Ava and Mia.
  const dm = await prisma.channel.create({
    data: {
      workspaceId: workspace.id,
      type: "DM",
      createdById: ava.id,
      members: { create: [{ userId: ava.id }, { userId: mia.id }] },
    },
  });
  await prisma.conversationMember.createMany({
    data: [
      { channelId: dm.id, userId: ava.id },
      { channelId: dm.id, userId: mia.id },
    ],
    skipDuplicates: true,
  });
  await prisma.message.createMany({
    data: [
      { channelId: dm.id, authorId: ava.id, content: "Hey Mia — did you see the new dark mode? 🌙" },
      { channelId: dm.id, authorId: mia.id, content: "Just tried it, it's gorgeous. The glass sidebar is *chef's kiss*." },
    ],
  });

  console.log("✅ Seed complete.");
  console.log("   Workspace: Orbit HQ");
  console.log("   Login: ava@orbit.dev / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
