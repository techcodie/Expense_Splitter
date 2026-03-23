/**
 * Seed Script — PeerFlow Demo Data
 *
 * Creates:
 *   5 users  →  2 groups  →  messy expenses (including recurring)
 *
 * Usage:
 *   npm run seed
 *
 * All monetary values are in integer paise.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const User = require('./models/User');
const Group = require('./models/Group');
const Expense = require('./models/Expense');
const Payment = require('./models/Payment');
const GroupMemberStatus = require('./models/GroupMemberStatus');
const OverdueVote = require('./models/OverdueVote');

const USERS = [
    { name: 'Aarav Sharma', email: 'aarav@demo.com', password: 'demo1234' },
    { name: 'Priya Patel', email: 'priya@demo.com', password: 'demo1234' },
    { name: 'Rohan Gupta', email: 'rohan@demo.com', password: 'demo1234' },
    { name: 'Sneha Iyer', email: 'sneha@demo.com', password: 'demo1234' },
    { name: 'Kabir Mehta', email: 'kabir@demo.com', password: 'demo1234' },
];

async function seed() {
    await connectDB();
    console.log('🗑️  Clearing existing data…');
    await OverdueVote.deleteMany({});
    await GroupMemberStatus.deleteMany({});
    await Payment.deleteMany({});
    await Expense.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});

    // ───── 1. Create Users ─────
    console.log('👤 Creating 5 users…');
    const users = await User.create(USERS);
    const [aarav, priya, rohan, sneha, kabir] = users;
    console.log(`   Users: ${users.map((u) => u.name).join(', ')}`);

    // ═══════════════════════════════════════════════════════
    // GROUP 1: Goa Trip 2026 — messy one-time expenses
    // ═══════════════════════════════════════════════════════
    console.log('\n👥 Creating group 1: "Goa Trip 2026"…');
    const group1 = await Group.create({
        name: 'Goa Trip 2026',
        createdBy: aarav._id,
        members: users.map((u) => u._id),
        joinCode: 'GOATRIP',
        settlementThreshold: 50000, // ₹500
    });
    console.log(`   Group: ${group1.name} (code: ${group1.joinCode})`);

    console.log('💸 Creating 10 messy expenses for Goa Trip…');
    const goaReqApprovals = Math.ceil(users.length / 2); // 3
    const goaExpenses = [
        {
            group: group1._id, createdBy: aarav._id, description: 'Hotel booking (2 nights)',
            totalAmount: 250000, paidBy: aarav._id,
            splits: users.map((u) => ({ user: u._id, shareAmount: 50000 })),
            status: 'approved', requiredApprovals: goaReqApprovals,
        },
        {
            group: group1._id, createdBy: priya._id, description: 'Beach shack dinner',
            totalAmount: 80000, paidBy: priya._id,
            splits: users.map((u) => ({ user: u._id, shareAmount: 16000 })),
            status: 'approved', requiredApprovals: goaReqApprovals,
        },
        {
            group: group1._id, createdBy: rohan._id, description: 'Scooter rentals (3 bikes)',
            totalAmount: 120000, paidBy: rohan._id,
            splits: [
                { user: rohan._id, shareAmount: 40000 },
                { user: sneha._id, shareAmount: 40000 },
                { user: kabir._id, shareAmount: 40000 },
            ],
            status: 'approved', requiredApprovals: goaReqApprovals,
        },
        {
            group: group1._id, createdBy: sneha._id, description: 'Groceries & snacks',
            totalAmount: 65000, paidBy: sneha._id,
            splits: users.map((u) => ({ user: u._id, shareAmount: 13000 })),
            status: 'approved', requiredApprovals: goaReqApprovals,
        },
        {
            group: group1._id, createdBy: kabir._id, description: 'Water sports package',
            totalAmount: 180000, paidBy: kabir._id,
            splits: [
                { user: aarav._id, shareAmount: 45000 },
                { user: rohan._id, shareAmount: 45000 },
                { user: sneha._id, shareAmount: 45000 },
                { user: kabir._id, shareAmount: 45000 },
            ],
            status: 'approved', requiredApprovals: goaReqApprovals,
        },
        {
            group: group1._id, createdBy: aarav._id, description: 'Airport taxi',
            totalAmount: 40000, paidBy: aarav._id,
            splits: [
                { user: aarav._id, shareAmount: 20000 },
                { user: priya._id, shareAmount: 20000 },
            ],
            status: 'approved', requiredApprovals: goaReqApprovals,
        },
        {
            group: group1._id, createdBy: priya._id, description: 'Club Cubana entry',
            totalAmount: 35000, paidBy: priya._id,
            splits: users.map((u) => ({ user: u._id, shareAmount: 7000 })),
            status: 'approved', requiredApprovals: goaReqApprovals,
        },
        {
            group: group1._id, createdBy: rohan._id, description: 'Dolphin boat ride',
            totalAmount: 95000, paidBy: rohan._id,
            splits: users.map((u) => ({ user: u._id, shareAmount: 19000 })),
            status: 'approved', requiredApprovals: goaReqApprovals,
        },
        {
            group: group1._id, createdBy: sneha._id, description: 'Souvenir shopping',
            totalAmount: 27500, paidBy: sneha._id,
            splits: [
                { user: sneha._id, shareAmount: 9167 },
                { user: priya._id, shareAmount: 9167 },
                { user: kabir._id, shareAmount: 9166 },
            ],
            status: 'approved', requiredApprovals: goaReqApprovals,
        },
        {
            group: group1._id, createdBy: kabir._id, description: 'Farewell lunch',
            totalAmount: 50000, paidBy: kabir._id,
            splits: users.map((u) => ({ user: u._id, shareAmount: 10000 })),
            status: 'approved', requiredApprovals: goaReqApprovals,
        },
    ];
    await Expense.insertMany(goaExpenses);
    console.log(`   Created ${goaExpenses.length} expenses`);

    // ═══════════════════════════════════════════════════════
    // GROUP 2: Flatmates Monthly — recurring expenses
    // ═══════════════════════════════════════════════════════
    const flatmates = [aarav, priya, rohan, sneha]; // 4 members
    console.log('\n👥 Creating group 2: "Flatmates Monthly"…');
    const group2 = await Group.create({
        name: 'Flatmates Monthly',
        createdBy: priya._id,
        members: flatmates.map((u) => u._id),
        joinCode: 'FLAT2026',
        settlementThreshold: 100000, // ₹1000
    });
    console.log(`   Group: ${group2.name} (code: ${group2.joinCode})`);

    console.log('💸 Creating 8 expenses (including recurring) for Flatmates…');
    const flatReqApprovals = Math.ceil(flatmates.length / 2); // 2
    const flatExpenses = [
        {
            group: group2._id, createdBy: aarav._id, description: 'Rent — March 2026',
            totalAmount: 4000000, paidBy: aarav._id,
            splits: flatmates.map((u) => ({ user: u._id, shareAmount: 1000000 })),
            isRecurring: true, recurrence: { frequency: 'monthly', interval: 1 },
            status: 'approved', requiredApprovals: flatReqApprovals,
        },
        {
            group: group2._id, createdBy: priya._id, description: 'WiFi bill — March',
            totalAmount: 150000, paidBy: priya._id,
            splits: flatmates.map((u) => ({ user: u._id, shareAmount: 37500 })),
            isRecurring: true, recurrence: { frequency: 'monthly', interval: 1 },
            status: 'approved', requiredApprovals: flatReqApprovals,
        },
        {
            group: group2._id, createdBy: rohan._id, description: 'Electricity bill — March',
            totalAmount: 320000, paidBy: rohan._id,
            splits: flatmates.map((u) => ({ user: u._id, shareAmount: 80000 })),
            isRecurring: true, recurrence: { frequency: 'monthly', interval: 1 },
            status: 'approved', requiredApprovals: flatReqApprovals,
        },
        {
            group: group2._id, createdBy: sneha._id, description: 'Maid salary — March',
            totalAmount: 600000, paidBy: sneha._id,
            splits: flatmates.map((u) => ({ user: u._id, shareAmount: 150000 })),
            isRecurring: true, recurrence: { frequency: 'monthly', interval: 1 },
            status: 'approved', requiredApprovals: flatReqApprovals,
        },
        {
            group: group2._id, createdBy: aarav._id, description: 'Kitchen supplies',
            totalAmount: 85000, paidBy: aarav._id,
            splits: flatmates.map((u) => ({ user: u._id, shareAmount: 21250 })),
            status: 'approved', requiredApprovals: flatReqApprovals,
        },
        {
            group: group2._id, createdBy: priya._id, description: 'House party food & drinks',
            totalAmount: 420000, paidBy: priya._id,
            splits: [
                { user: aarav._id, shareAmount: 140000 },
                { user: priya._id, shareAmount: 140000 },
                { user: sneha._id, shareAmount: 140000 },
            ],
            status: 'approved', requiredApprovals: flatReqApprovals,
        },
        {
            group: group2._id, createdBy: rohan._id, description: 'Weekly groceries',
            totalAmount: 250000, paidBy: rohan._id,
            splits: flatmates.map((u) => ({ user: u._id, shareAmount: 62500 })),
            isRecurring: true, recurrence: { frequency: 'weekly', interval: 1 },
            status: 'approved', requiredApprovals: flatReqApprovals,
        },
        {
            group: group2._id, createdBy: sneha._id, description: 'Water purifier AMC',
            totalAmount: 200000, paidBy: sneha._id,
            splits: flatmates.map((u) => ({ user: u._id, shareAmount: 50000 })),
            status: 'approved', requiredApprovals: flatReqApprovals,
        },
    ];
    await Expense.insertMany(flatExpenses);
    console.log(`   Created ${flatExpenses.length} expenses (${flatExpenses.filter((e) => e.isRecurring).length} recurring)`);

    // ───── Summary ─────
    const allExpenses = [...goaExpenses, ...flatExpenses];
    const totalSpent = allExpenses.reduce((s, e) => s + e.totalAmount, 0);
    console.log('\n────────────── SEED COMPLETE ──────────────');
    console.log(`  Users:           ${users.length}`);
    console.log(`  Groups:          2`);
    console.log(`    ${group1.name} (${group1.joinCode}) — ${goaExpenses.length} expenses`);
    console.log(`    ${group2.name} (${group2.joinCode}) — ${flatExpenses.length} expenses`);
    console.log(`  Total Expenses:  ${allExpenses.length}`);
    console.log(`  Total Spent:     ₹${(totalSpent / 100).toFixed(2)}`);
    console.log('');
    console.log('  Login credentials (all passwords: demo1234):');
    for (const u of users) {
        console.log(`    ${u.email}`);
    }
    console.log('───────────────────────────────────────────');

    await mongoose.disconnect();
    console.log('\n✅ Done. DB disconnected.');
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
