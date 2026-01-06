import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const images = [
  '/uploads/06d195c43b8e7563f26d849fae2e4fd6.jpg',
  '/uploads/0798c7645247f3cf6b6b47cf562cf0c7.jpg',
  '/uploads/16c24ec6056b80048512b5564e7fa671.jpg',
  '/uploads/35e45f6373b2b54e4a977117f61e9e2c.jpg',
  '/uploads/3b73867a29218e111d3b3169885b4e28.jpg',
  '/uploads/4292c766bebd70c2c20c183aa88f52ea.jpg',
  '/uploads/492507cc797e9a3b96ccd75945d4f350.jpg',
  '/uploads/4cc0ea1bdbb217b334485d38c4e19f28.jpg',
  '/uploads/5737d7fd13c865fff12218cd86d4a176.jpg',
  '/uploads/5bc8fc4f1be6ac775b1dd3b25dd70e02.jpg',
  '/uploads/5fb26fc3d58549afdfbf0d9803536ead.jpg',
  '/uploads/63c677fdb84fca1cba5cbac42db1e6f5.jpg',
  '/uploads/64364fbf6390fa268ffc27d30693fab2.jpg',
  '/uploads/682d4ec379ba0aa2de4aeda7599c9a3e.jpg',
  '/uploads/6ad28dbe0df495762a2479a100c040cb.jpg',
  '/uploads/7b6a6d26edadc45f022b741b3a4f88eb.jpg',
  '/uploads/7baae44299c0d254b86b7ed22f836b77.jpg',
  '/uploads/81017e02585e9a48729f98d6373849ea.jpg',
  '/uploads/8b657489fa35658b8a660e843261b433.jpg',
  '/uploads/96351470484dc56317eb18ec437031cd.jpg',
  '/uploads/98049e1a562cf63ea36f211760f560e2.jpg',
  '/uploads/991c8d62284016607d80beedf36b1d25.jpg',
  '/uploads/9e81e05ca11c50aae1930f4f9b74beae.jpg',
  '/uploads/a37f06266f5463e119357bad9a772e0a.jpg',
  '/uploads/b82417c95c6578c0cf286bbffbc00ef8.jpg',
  '/uploads/b85924a520db600ffe0c32c4778e1598.jpg',
  '/uploads/bad95f7e27ed116433b2e6857a5d7452.jpg',
  '/uploads/ca33b0fafd26eef5d835decc4fc2dab3.jpg',
  '/uploads/cb2cdd17c3053ff700a425792d3d10b5.jpg',
  '/uploads/dbf0e331bf0b46da8a0d6a19344fa08c.jpg',
  '/uploads/e1305d2620572f1dca964938f92b601e.jpg',
  '/uploads/fe215e162a9e25acbbc14de9bf9a1c69.jpg'
];

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Clear Database
  await prisma.attendee.deleteMany();
  await prisma.event.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();
  
  console.log('✅ Cleared database');

  // 2. Create System Settings
  await prisma.systemSetting.create({
    data: {
      key: 'COMMISSION_RATE',
      value: '10', // 10%
      description: 'Platform commission rate in percentage',
    }
  });
  console.log('✅ Set default commission to 10%');

  // 3. Create Users
  const password = await bcrypt.hash('Hello@123', 10);
  const userPassword = await bcrypt.hash('hello@123', 10);
  
  // 1. Admin (Platform Owner)
  const admin = await prisma.user.create({
    data: {
      email: 'lenishmagar@gmail.com',
      username: 'Lenish Admin',
      password, // Hello@123
      role: 'ADMIN',
      avatar: 'https://ui-avatars.com/api/?name=Lenish+Admin&background=0D8ABC&color=fff',
      balance: 0,
    }
  });

  // 2. Standard User (Organizer & Attendee)
  const user = await prisma.user.create({
    data: {
      email: 'lenishmagar123@gmail.com',
      username: 'Lenish User',
      password: userPassword, // hello@123
      role: 'USER',
      avatar: 'https://ui-avatars.com/api/?name=Lenish+User&background=random',
      balance: 0,
    }
  });

  console.log('✅ Created 2 Users: Admin & User');

  // 4. Create Categories
  const categoriesData = [
    { name: 'Music & Concerts', slug: 'music-concerts', icon: '🎵', color: '#FF6B6B' },
    { name: 'Technology & Innovation', slug: 'technology-innovation', icon: '💻', color: '#5B9BD5' },
    { name: 'Sports & Fitness', slug: 'sports-fitness', icon: '�', color: '#4ECDC4' },
    { name: 'Food & Drink', slug: 'food-drink', icon: '🍔', color: '#F38181' },
  ];

  const createdCategories = [];
  for (const cat of categoriesData) {
    createdCategories.push(await prisma.category.create({ data: cat }));
  }
  console.log('✅ Created Categories');

  // 5. Create Events
  const events = [
    // --- Admin Owned Events (100% Revenue) ---
    {
      title: 'Summer Music Festival 2025',
      slug: 'summer-music-festival',
      description: 'Experience the biggest music festival of the summer with international artists.',
      startDate: new Date('2025-06-15T14:00:00Z'),
      endDate: new Date('2025-06-15T23:00:00Z'),
      city: 'Kathmandu',
      venueName: 'Dasarath Rangasala',
      price: 5000,
      currency: 'NPR',
      capacity: 10000,
      status: 'PUBLISHED',
      categoryId: createdCategories[0].id, // Music
      organizerId: admin.id,
      coverImage: images[0],
      isFree: false,
    },
    {
      title: 'Startup Networking Night',
      slug: 'startup-networking',
      description: 'Connect with founders, investors, and fellow entrepreneurs.',
      city: 'Kathmandu',
      venueName: 'Work Around',
      startDate: new Date('2025-01-30T17:00:00Z'),
      endDate: new Date('2025-01-30T20:00:00Z'),
      price: 500,
      currency: 'NPR',
      capacity: 100,
      status: 'PUBLISHED',
      categoryId: createdCategories[1].id, // Tech
      organizerId: admin.id,
      coverImage: images[4],
      isFree: false,
    },
    {
      title: 'Charity Gala Dinner',
      slug: 'charity-gala',
      description: 'Annual charity fundraising dinner for local schools.',
      startDate: new Date('2025-08-20T19:00:00Z'),
      endDate: new Date('2025-08-20T22:00:00Z'),
      city: 'Kathmandu',
      venueName: 'Hotel Yak & Yeti',
      price: 10000,
      currency: 'NPR',
      capacity: 200,
      status: 'PUBLISHED',
      categoryId: createdCategories[3].id, // Food
      organizerId: admin.id,
      coverImage: images[2],
      isFree: false,
    },

    // --- User Owned Events (90% Revenue / 10% Commission) ---
    {
      title: 'User Tech Workshop',
      slug: 'user-tech-workshop',
      description: 'A hands-on workshop on modern web development organized by the community.',
      startDate: new Date('2025-11-15T10:00:00Z'),
      endDate: new Date('2025-11-15T16:00:00Z'),
      city: 'Lalitpur',
      venueName: 'Tech Hub',
      price: 1000,
      currency: 'NPR',
      capacity: 50,
      status: 'PUBLISHED',
      categoryId: createdCategories[1].id, // Tech
      organizerId: user.id,
      coverImage: images[5],
       isFree: false,
    },
    {
      title: 'Global Food Expo',
      slug: 'global-food-expo',
      description: 'Taste cuisines from over 30 countries in one place.',
      startDate: new Date('2025-05-20T11:00:00Z'),
      endDate: new Date('2025-05-22T20:00:00Z'),
      city: 'Bhaktapur',
      venueName: 'Bhaktapur Durbar Square',
      price: 500,
      currency: 'NPR',
      capacity: 2000,
      status: 'PUBLISHED',
      categoryId: createdCategories[3].id, // Food
      organizerId: user.id,
      coverImage: images[3],
       isFree: false,
    },
    {
      title: 'City Marathon 2025',
      slug: 'city-marathon-2025',
      description: 'Run for health! Annual city marathon.',
      city: 'Pokhara',
      venueName: 'Lakeside',
      startDate: new Date('2025-03-05T06:00:00Z'),
      endDate: new Date('2025-03-05T12:00:00Z'),
      price: 2500,
      currency: 'NPR',
      capacity: 3000,
      status: 'PUBLISHED',
      categoryId: createdCategories[2].id, // Sports
      organizerId: user.id,
      coverImage: images[1],
       isFree: false,
    },
    {
      title: 'Yoga in the Park',
      slug: 'yoga-park',
      description: 'Morning yoga session for mindfulness and health.',
      city: 'Kathmandu',
      venueName: 'Ratna Park',
      startDate: new Date('2025-04-01T06:00:00Z'),
      endDate: new Date('2025-04-01T07:30:00Z'),
      price: 0,
      currency: 'NPR',
      capacity: 50,
      status: 'PUBLISHED',
      categoryId: createdCategories[2].id, // Sports
      organizerId: user.id,
      coverImage: images[6] || images[0],
      isFree: true,
    },
    {
      title: 'Indie Game Showcase',
      slug: 'indie-game-showcase',
      description: 'Showcase your indie games and meet developers.',
      city: 'Lalitpur',
      venueName: 'Labim Mall',
      startDate: new Date('2025-09-10T10:00:00Z'),
      endDate: new Date('2025-09-10T18:00:00Z'),
      price: 200,
      currency: 'NPR',
      capacity: 500,
      status: 'PUBLISHED',
      categoryId: createdCategories[1].id, // Tech
      organizerId: user.id,
      coverImage: images[7] || images[1],
      isFree: false,
    }
  ];

  for (const event of events) {
      await prisma.event.create({ 
        data: {
          ...event,
          status: event.status as 'PUBLISHED' | 'DRAFT' | 'CANCELLED'
        } 
      });
  }

  // 6. Simulate Transactions (Earnings)
  console.log('💸 Simulating transactions...');

  // Scenario 1: Admin buys ticket for User's "User Tech Workshop" (Price: 1000)
  // Commission: 10% (100) -> Admin Balance
  // Earning: 90% (900) -> User Balance
  
  const userEvent = await prisma.event.findUnique({ where: { slug: 'user-tech-workshop' } });
  if (userEvent) {
    await prisma.attendee.create({
      data: {
        eventId: userEvent.id,
        userId: admin.id,
        status: 'REGISTERED',
        paymentStatus: 'COMPLETED',
        paymentAmount: 1000,
        platformFee: 100,
        ticketCount: 1,
        ticketType: 'General',
        registeredAt: new Date(Date.now() - 86400000), // Yesterday
      }
    });

    // Update Balances
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: 900 } }
    });
    await prisma.user.update({
      where: { id: admin.id },
      data: { balance: { increment: 100 } }
    });
  }

  // Scenario 2: User buys ticket for Admin's "Admin Mega Concert" (Price: 5000)
  // Commission: 0% -> Admin gets 100% (5000)
  
  const adminEvent = await prisma.event.findUnique({ where: { slug: 'admin-mega-concert' } });
  if (adminEvent) {
    await prisma.attendee.create({
      data: {
        eventId: adminEvent.id,
        userId: user.id, // User buying
        status: 'REGISTERED',
        paymentStatus: 'COMPLETED',
        paymentAmount: 5000,
        platformFee: 0,
        ticketCount: 1,
        ticketType: 'VIP',
        registeredAt: new Date(Date.now() - 172800000), // 2 Days ago
      }
    });

    // Update Admin Balance
    await prisma.user.update({
      where: { id: admin.id },
      data: { balance: { increment: 5000 } }
    });
  }

  console.log('✅ Created Simulated Transactions (Check Earnings!)');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
