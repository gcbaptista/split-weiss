import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });
if (!process.env.DATABASE_URL) dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const raw = JSON.parse(fs.readFileSync("scripts/expenses.json", "utf-8"));
  const items = raw.items as Array<{
    item_name: string;
    price: number;
    currency_code: string;
    advance_payer_id: number;
    advance_payer_name: string;
    create_datetime: string;
    debtors: Array<{ debtor_id: number; debtor_name: string }>;
  }>;

  // 1. Collect all unique people (payers + debtors)
  const peopleMap = new Map<number, string>();
  for (const item of items) {
    peopleMap.set(item.advance_payer_id, item.advance_payer_name);
    for (const d of item.debtors) {
      peopleMap.set(d.debtor_id, d.debtor_name);
    }
  }

  console.log(`Found ${peopleMap.size} unique members`);
  console.log(`Found ${items.length} expenses`);

  // 2. Create group
  const group = await prisma.group.create({
    data: {
      name: "Praga DEECotrip",
      currency: "EUR",
      emoji: "✈️",
    },
  });
  console.log(`Created group: ${group.id}`);

  // 3. Create group members
  const externalIdToMemberId = new Map<number, string>();

  for (const [externalId, name] of peopleMap) {
    const member = await prisma.groupMember.create({
      data: {
        groupId: group.id,
        name,
      },
    });
    externalIdToMemberId.set(externalId, member.id);
    console.log(`  Created member: ${name} -> ${member.id}`);
  }

  // 4. Create expenses with equal splits among debtors
  let created = 0;
  for (const item of items) {
    const payerId = externalIdToMemberId.get(item.advance_payer_id)!;
    const total = new Decimal(item.price);
    const debtorCount = item.debtors.length;

    // Calculate equal split
    const base = total.div(debtorCount).toDecimalPlaces(2, Decimal.ROUND_DOWN);
    const remainder = total.minus(base.mul(debtorCount));
    const pennies = remainder.div("0.01").toDecimalPlaces(0).toNumber();

    const splits = item.debtors.map((d, i) => {
      const userId = externalIdToMemberId.get(d.debtor_id)!;
      const amount = i < pennies ? base.plus("0.01") : base;
      return {
        userId,
        amount: amount.toFixed(2),
        isLocked: false,
      };
    });

    await prisma.expense.create({
      data: {
        groupId: group.id,
        payerId,
        title: item.item_name.trim(),
        amount: total.toFixed(2),
        currency: item.currency_code,
        splitMode: "LOCK",
        date: new Date(item.create_datetime),
        splits: {
          create: splits,
        },
      },
    });
    created++;
    if (created % 10 === 0) console.log(`  Created ${created}/${items.length} expenses`);
  }

  console.log(`\nDone! Created ${created} expenses in group "${group.name}" (${group.id})`);
  console.log(`Open: http://localhost:3000/groups/${group.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
