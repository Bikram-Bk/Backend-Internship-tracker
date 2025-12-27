import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcrypt';
import fs from 'fs-extra';
import path from 'path';

const prisma = new PrismaClient();
const backupFile = path.join(process.cwd(), 'prisma/data/backup.json');

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

const categoriesData = [
  { name: 'Music & Concerts', slug: 'music-concerts', description: 'Live music performances, concerts, and music festivals', icon: '🎵', color: '#FF6B6B' },
  { name: 'Sports & Fitness', slug: 'sports-fitness', description: 'Sports events, fitness classes, and athletic competitions', icon: '🏃', color: '#4ECDC4' },
  { name: 'Arts & Culture', slug: 'arts-culture', description: 'Art exhibitions, cultural events, and creative workshops', icon: '🎨', color: '#95E1D3' },
  { name: 'Food & Drink', slug: 'food-drink', description: 'Food festivals, cooking classes, and culinary experiences', icon: '🍔', color: '#F38181' },
  { name: 'Business & Networking', slug: 'business-networking', description: 'Professional networking, conferences, and business meetups', icon: '💼', color: '#AA96DA' },
  { name: 'Technology & Innovation', slug: 'technology-innovation', description: 'Tech conferences, hackathons, and innovation summits', icon: '💻', color: '#5B9BD5' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Check for Backup File
  if (await fs.pathExists(backupFile)) {
    console.log('📂 Found backup file. Restoring from backup...');
    const backup = await fs.readJson(backupFile);

    // RESTORE USERS
    if (backup.users?.length) {
      console.log(`Restoring ${backup.users.length} users...`);
      for (const user of backup.users) {
        await prisma.user.upsert({
          where: { id: user.id },
          create: user,
          update: user,
        });
      }
    }

    // RESTORE CATEGORIES
    if (backup.categories?.length) {
      console.log(`Restoring ${backup.categories.length} categories...`);
      for (const cat of backup.categories) {
        await prisma.category.upsert({
          where: { id: cat.id },
          create: cat,
          update: cat,
        });
      }
    }

    // RESTORE EVENTS
    if (backup.events?.length) {
      console.log(`Restoring ${backup.events.length} events...`);
      for (const event of backup.events) {
        // Handle decimals if stored as strings/numbers
        if (event.price) event.price = event.price;
        
        await prisma.event.upsert({
          where: { id: event.id },
          create: event,
          update: event,
        });
      }
    }

    // RESTORE ATTENDEES
    if (backup.attendees?.length) {
      console.log(`Restoring ${backup.attendees.length} attendees...`);
      for (const attendee of backup.attendees) {
        await prisma.attendee.upsert({
          where: { id: attendee.id },
          create: attendee,
          update: attendee,
        });
      }
    }

    console.log('✅ Restore execution completed!');
    return;
  }

  // 2. Default Seeding (No Backup Found)
  console.log('⚠️ No backup file found. Using default seed data.');

  // Create Admin User
  const password = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'EventAdmin',
      password,
      role: 'ADMIN',
      avatar: images[0],
    },
  });
  console.log('✅ Created admin user');

  // Clear existing events first (handles dependency)
  await prisma.event.deleteMany({});
  console.log('✅ Cleared existing events');

  // Clear existing categories
  await prisma.category.deleteMany({});
  
  // Create categories
  const createdCategories = [];
  for (const category of categoriesData) {
    const cat = await prisma.category.create({ data: category });
    createdCategories.push(cat);
  }
  console.log(`✅ Created ${createdCategories.length} categories`);

  // Generate Events
  const events = [
    {
      title: 'Summer Music Festival',
      description: 'Experience the biggest music festival of the summer with top artists from around the world.',
      city: 'Kathmandu',
      country: 'Nepal',
      venueName: 'Dasarath Rangasala',
      startDate: new Date('2025-06-15T14:00:00Z'),
      endDate: new Date('2025-06-15T23:00:00Z'),
      price: 5000,
      currency: 'NPR',
      capacity: 10000,
      slug: 'summer-music-festival-2025'
    },
    {
      title: 'Tech Innovation Summit 2025',
      description: 'Join industry leaders to discuss the future of technology and innovation.',
      city: 'Lalitpur',
      country: 'Nepal',
      venueName: 'Hotel Himalaya',
      startDate: new Date('2025-04-10T09:00:00Z'),
      endDate: new Date('2025-04-12T17:00:00Z'),
      price: 15000,
      currency: 'NPR',
      capacity: 500,
      slug: 'tech-innovation-summit-2025'
    },
    {
      title: 'Global Food Expo',
      description: 'Taste cuisines from over 30 countries at this culinary extravaganza.',
      city: 'Bhaktapur',
      country: 'Nepal',
      venueName: 'Bhaktapur Durbar Square',
      startDate: new Date('2025-05-20T11:00:00Z'),
      endDate: new Date('2025-05-22T20:00:00Z'),
      price: 1000,
      currency: 'NPR',
      capacity: 2000,
      slug: 'global-food-expo-2025'
    },
    {
      title: 'City Marathon 2025',
      description: 'Annual city marathon raising funds for local charities.',
      city: 'Pokhara',
      country: 'Nepal',
      venueName: 'Lakeside',
      startDate: new Date('2025-03-05T06:00:00Z'),
      endDate: new Date('2025-03-05T12:00:00Z'),
      price: 2500,
      currency: 'NPR',
      capacity: 3000,
      slug: 'city-marathon-2025'
    },
    {
      title: 'Modern Art Gallery Opening',
      description: 'Exclusive opening of the new modern art collection featuring local artists.',
      city: 'Kathmandu',
      country: 'Nepal',
      venueName: 'Nepal Art Council',
      startDate: new Date('2025-02-14T18:00:00Z'),
      endDate: new Date('2025-02-14T22:00:00Z'),
      price: 0,
      capacity: 200,
      isFree: true,
      slug: 'modern-art-gallery-opening'
    },
    {
      title: 'Startup Networking Night',
      description: 'Connect with founders, investors, and fellow entrepreneurs.',
      city: 'Kathmandu',
      country: 'Nepal',
      venueName: 'Work Around',
      startDate: new Date('2025-01-30T17:00:00Z'),
      endDate: new Date('2025-01-30T20:00:00Z'),
      price: 500,
      currency: 'NPR',
      capacity: 100,
      slug: 'startup-networking-night'
    }
  ];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const category = createdCategories[i % createdCategories.length];
    const eventImages = images.slice(i * 3, (i * 3) + 3);

    // Check if event exists
    const existingEvent = await prisma.event.findFirst({
      where: { slug: event.slug }
    });

    if (existingEvent) {
      await prisma.event.update({
        where: { id: existingEvent.id },
        data: {
          ...event,
          categoryId: category.id,
          organizerId: admin.id,
          coverImage: eventImages[0],
          images: eventImages.slice(1),
          status: 'PUBLISHED',
        },
      });
    } else {
      await prisma.event.create({
        data: {
          ...event,
          categoryId: category.id,
          organizerId: admin.id,
          coverImage: eventImages[0],
          images: eventImages.slice(1),
          status: 'PUBLISHED',
        },
      });
    }
  }

  console.log(`✅ Seeded ${events.length} events`);
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
