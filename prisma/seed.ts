import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "uiucbadm576@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "hhcomp-admin-2026";

  const existing = await prisma.user.findUnique({
    where: { emailLower: adminEmail.toLowerCase() },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name: "AV (Admin)",
        email: adminEmail.toLowerCase(),
        emailLower: adminEmail.toLowerCase(),
        passwordHash,
        role: "ADMIN",
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
    console.log(
      `Default password: ${adminPassword} (set SEED_ADMIN_PASSWORD env var to override)`
    );
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  const settings = await prisma.competitionSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    await prisma.competitionSettings.create({
      data: {
        id: 1,
        submissionDeadline: new Date("2026-05-02T04:59:59Z"), // 11:59 PM CT May 1
        gracePeriodEnd: new Date("2026-05-02T07:00:00Z"),      // 2:00 AM CT May 2
        registrationClose: new Date("2026-05-02T04:59:59Z"),
        leaderboardVisibility: "VISIBLE",
        dataDownloadsEnabled: false,
      },
    });
    console.log("Created default competition settings.");
  }

  const faqCount = await prisma.fAQItem.count();
  if (faqCount === 0) {
    await prisma.fAQItem.createMany({
      data: [
        {
          question: "Who is eligible to participate?",
          answer:
            "Any currently enrolled student of the Gies College of Business at the University of Illinois Urbana-Champaign.",
          displayOrder: 1,
        },
        {
          question: "What is the team size?",
          answer:
            "Exactly two students per team. No solo registrations, no teams of three or more.",
          displayOrder: 2,
        },
        {
          question: "What is the submission deadline?",
          answer:
            "Friday, May 1, 2026 at 11:59 PM Central Time. A 2-hour grace period follows until 2:00 AM CT May 2, after which late submissions are flagged on the leaderboard.",
          displayOrder: 3,
        },
        {
          question: "What do we submit?",
          answer:
            "Four components: (1) a completed prediction Excel file, (2) your code / model files, (3) a written methodology PDF, and (4) a PowerPoint presentation.",
          displayOrder: 4,
        },
        {
          question: "How is scoring done?",
          answer:
            "An automated scorer computes weighted MAPE (Mean Absolute Percentage Error) on your predictions against Horizon Hobby's held-back actuals for three parts. The latest version of your prediction file is what gets scored.",
          displayOrder: 5,
        },
      ],
    });
    console.log("Seeded FAQ items.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
