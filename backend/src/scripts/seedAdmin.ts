import bcrypt from "bcrypt";
import { getPrisma } from "../config/prisma.js";

const adminName = process.env.ADMIN_NAME || "Demo Admin";
const adminEmail = process.env.ADMIN_EMAIL || "admin@demo.com";
const adminPassword = process.env.ADMIN_PASSWORD || "adminuser123";

const seedAdmin = async () => {
  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash,
      role: "ADMIN"
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: "ADMIN"
    }
  });

  console.log(`Seeded admin account: ${adminEmail}`);
};

seedAdmin()
  .catch((error: unknown) => {
    console.error("Could not seed admin account", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
