import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ── Roles ────────────────────────────────────────────────────────
  const roles = [
    { code: 'USER',      displayName: 'User',            sortOrder: 1 },
    { code: 'STAFF',     displayName: 'Staff Member',    sortOrder: 2 },
    { code: 'OWNER',     displayName: 'Business Owner',  sortOrder: 3 },
    { code: 'VERIFIER',  displayName: 'Verifier',        sortOrder: 4 },
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { displayName: role.displayName },
      create: role,
    })
  }

  console.log('Seeded roles:', roles.map(r => r.code).join(', '))

  // ── Plans ────────────────────────────────────────────────────────
  const plans = [
    {
      slug: 'demo',
      name: 'Demo',
      priceMonthlyPaise: null,
      priceYearlyPaise: null,
      maxSpaces: null,
      maxStaff: null,
      analyticsDays: null,
      features: { dutyTracking: true, staffPerformance: true, amountOverride: true, prioritySupport: false },
    },
    {
      slug: 'starter',
      name: 'Starter',
      priceMonthlyPaise: 129900,
      priceYearlyPaise: 1299900,
      maxSpaces: 1,
      maxStaff: 3,
      analyticsDays: 30,
      features: { dutyTracking: true, staffPerformance: false, amountOverride: false, prioritySupport: false },
    },
    {
      slug: 'growth',
      name: 'Growth',
      priceMonthlyPaise: 299900,
      priceYearlyPaise: 2999900,
      maxSpaces: 3,
      maxStaff: 10,
      analyticsDays: 180,
      features: { dutyTracking: true, staffPerformance: true, amountOverride: true, prioritySupport: false },
    },
    {
      slug: 'pro',
      name: 'Pro',
      priceMonthlyPaise: 599900,
      priceYearlyPaise: 5999900,
      maxSpaces: 10,
      maxStaff: 20,
      analyticsDays: 365,
      features: { dutyTracking: true, staffPerformance: true, amountOverride: true, prioritySupport: true },
    },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    })
  }

  console.log('Seeded plans:', plans.map(p => p.slug).join(', '))

  // ── System settings ──────────────────────────────────────────────
  await prisma.systemSetting.upsert({
    where:  { key: 'upi_qr_content' },
    update: {},
    create: { key: 'upi_qr_content', value: 'upi://pay?pa=plutofeb115@okhdfcbank&pn=Kaustubh%20Paturi&aid=uGICAgID3-qmgfA' },
  })

  console.log('Seeded system settings')
  console.log('Seed complete')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
