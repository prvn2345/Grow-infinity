import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old data...');
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.teacherSelection.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subject.deleteMany();

  console.log('Seeding subjects...');
  const math = await prisma.subject.create({ data: { name: 'Math' } });
  const physics = await prisma.subject.create({ data: { name: 'Physics' } });
  const chemistry = await prisma.subject.create({ data: { name: 'Chemistry' } });
  const biology = await prisma.subject.create({ data: { name: 'Biology' } });
  const english = await prisma.subject.create({ data: { name: 'English' } });
  const science = await prisma.subject.create({ data: { name: 'Science' } });
  const socialStudies = await prisma.subject.create({ data: { name: 'Social Studies' } });
  const art = await prisma.subject.create({ data: { name: 'Art' } });
  const dance = await prisma.subject.create({ data: { name: 'Dance' } });
  const music = await prisma.subject.create({ data: { name: 'Music' } });
  const coding = await prisma.subject.create({ data: { name: 'Coding' } });
  const compSci = await prisma.subject.create({ data: { name: 'Computer Science' } });

  const password = await bcrypt.hash('password123', 10);

  // ===================== TEACHERS =====================

  console.log('Creating Teacher 1: Rajesh Kumar...');
  const t1 = await prisma.user.create({
    data: {
      email: 'rajesh@test.com', username: 'rajesh_sir', phoneNo: '9876543210', password, role: 'TEACHER',
      teacherProfile: {
        create: {
          fullName: 'Rajesh Kumar', qualifications: ['M.Sc Physics', 'B.Ed'],
          experience: 8, location: 'Delhi', hourlyFee: 600, group: 'grp-4',
          teachingMode: ['Online', 'Offline'], isApproved: true, isVerified: true,
        }
      }
    }
  });
  const tp1 = await prisma.teacherProfile.findUnique({ where: { userId: t1.id } });
  if (tp1) await prisma.teacherSubject.createMany({ data: [{ teacherId: tp1.id, subjectId: physics.id }, { teacherId: tp1.id, subjectId: math.id }] });

  console.log('Creating Teacher 2: Priya Sharma...');
  const t2 = await prisma.user.create({
    data: {
      email: 'priya@test.com', username: 'priya_mam', phoneNo: '9876543211', password, role: 'TEACHER',
      teacherProfile: {
        create: {
          fullName: 'Priya Sharma', qualifications: ['M.Sc Chemistry', 'Ph.D Chemistry'],
          experience: 12, location: 'Mumbai', hourlyFee: 800, group: 'grp-4',
          teachingMode: ['Online'], isApproved: true, isVerified: true,
        }
      }
    }
  });
  const tp2 = await prisma.teacherProfile.findUnique({ where: { userId: t2.id } });
  if (tp2) await prisma.teacherSubject.createMany({ data: [{ teacherId: tp2.id, subjectId: chemistry.id }, { teacherId: tp2.id, subjectId: biology.id }] });

  console.log('Creating Teacher 3: Amit Verma...');
  const t3 = await prisma.user.create({
    data: {
      email: 'amit@test.com', username: 'amit_sir', phoneNo: '9876543212', password, role: 'TEACHER',
      teacherProfile: {
        create: {
          fullName: 'Amit Verma', qualifications: ['B.Sc Math', 'M.Ed'],
          experience: 5, location: 'Bangalore', hourlyFee: 400, group: 'grp-2',
          teachingMode: ['Offline'], isApproved: true, isVerified: true,
        }
      }
    }
  });
  const tp3 = await prisma.teacherProfile.findUnique({ where: { userId: t3.id } });
  if (tp3) await prisma.teacherSubject.createMany({ data: [{ teacherId: tp3.id, subjectId: math.id }, { teacherId: tp3.id, subjectId: science.id }, { teacherId: tp3.id, subjectId: english.id }] });

  console.log('Creating Teacher 4: Sneha Patel...');
  const t4 = await prisma.user.create({
    data: {
      email: 'sneha@test.com', username: 'sneha_mam', phoneNo: '9876543213', password, role: 'TEACHER',
      teacherProfile: {
        create: {
          fullName: 'Sneha Patel', qualifications: ['B.A English Literature', 'CELTA'],
          experience: 6, location: 'Pune', hourlyFee: 500, group: 'grp-3',
          teachingMode: ['Online', 'Offline'], isApproved: true, isVerified: true,
        }
      }
    }
  });
  const tp4 = await prisma.teacherProfile.findUnique({ where: { userId: t4.id } });
  if (tp4) await prisma.teacherSubject.createMany({ data: [{ teacherId: tp4.id, subjectId: english.id }, { teacherId: tp4.id, subjectId: math.id }] });

  console.log('Creating Teacher 5: Vikram Singh...');
  const t5 = await prisma.user.create({
    data: {
      email: 'vikram@test.com', username: 'vikram_sir', phoneNo: '9876543214', password, role: 'TEACHER',
      teacherProfile: {
        create: {
          fullName: 'Vikram Singh', qualifications: ['MCA', 'AWS Certified'],
          experience: 10, location: 'Hyderabad', hourlyFee: 700, group: 'grp-4',
          teachingMode: ['Online'], isApproved: true, isVerified: true,
        }
      }
    }
  });
  const tp5 = await prisma.teacherProfile.findUnique({ where: { userId: t5.id } });
  if (tp5) await prisma.teacherSubject.createMany({ data: [{ teacherId: tp5.id, subjectId: compSci.id }, { teacherId: tp5.id, subjectId: math.id }] });

  console.log('Creating Teacher 6: Meera Iyer (Art & Dance)...');
  const t6 = await prisma.user.create({
    data: {
      email: 'meera@test.com', username: 'meera_mam', phoneNo: '9876543215', password, role: 'TEACHER',
      teacherProfile: {
        create: {
          fullName: 'Meera Iyer', qualifications: ['BFA Fine Arts', 'Bharatanatyam Diploma'],
          experience: 15, location: 'Chennai', hourlyFee: 550, group: 'grp-5',
          teachingMode: ['Offline'], isApproved: true, isVerified: true,
        }
      }
    }
  });
  const tp6 = await prisma.teacherProfile.findUnique({ where: { userId: t6.id } });
  if (tp6) await prisma.teacherSubject.createMany({ data: [{ teacherId: tp6.id, subjectId: art.id }, { teacherId: tp6.id, subjectId: dance.id }] });

  // ===================== PARENTS =====================

  console.log('Creating Parent 1: Suresh Mehta...');
  await prisma.user.create({
    data: {
      email: 'suresh@test.com', username: 'suresh_parent', phoneNo: '9123456780', password, role: 'PARENT',
      parentProfile: { create: { fullName: 'Suresh Mehta', childName: 'Arjun Mehta', group: 'grp-4', subGroup: 'boards+iit-jee-neet', location: 'Delhi', budget: 5000, preferredTiming: '5PM - 7PM' } }
    }
  });

  console.log('Creating Parent 2: Anita Gupta...');
  await prisma.user.create({
    data: {
      email: 'anita@test.com', username: 'anita_parent', phoneNo: '9123456781', password, role: 'PARENT',
      parentProfile: { create: { fullName: 'Anita Gupta', childName: 'Riya Gupta', group: 'grp-3', subGroup: 'boards+foundation', location: 'Mumbai', budget: 4000, preferredTiming: '4PM - 6PM' } }
    }
  });

  console.log('Creating Parent 3: Deepak Joshi...');
  await prisma.user.create({
    data: {
      email: 'deepak@test.com', username: 'deepak_parent', phoneNo: '9123456782', password, role: 'PARENT',
      parentProfile: { create: { fullName: 'Deepak Joshi', childName: 'Kavya Joshi', group: 'grp-2', location: 'Bangalore', budget: 3000, preferredTiming: '6PM - 8PM' } }
    }
  });

  // Add some reviews
  if (tp1) {
    await prisma.review.create({ data: { teacherId: tp1.id, reviewerId: t1.id, rating: 5, comment: 'Excellent teacher!' } });
  }
  if (tp2) {
    await prisma.review.create({ data: { teacherId: tp2.id, reviewerId: t2.id, rating: 4, comment: 'Very knowledgeable.' } });
  }

  console.log('✅ Seeding complete! All demo data inserted.');
  console.log('');
  console.log('Test Credentials (all passwords: password123):');
  console.log('Teachers: rajesh@test.com, priya@test.com, amit@test.com, sneha@test.com, vikram@test.com, meera@test.com');
  console.log('Parents:  suresh@test.com, anita@test.com, deepak@test.com');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
