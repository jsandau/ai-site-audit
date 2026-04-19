import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const audit = await prisma.audit.create({
    data: {
      url: "https://example.com",
      status: "test",
      result: { hello: "world" }
    }
  })

  console.log("Created audit:", audit)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())