import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticate, authorizeRole, AuthRequest } from '../middlewares/auth';

const router = Router();

// Create / Update Parent Profile
router.post('/profile', authenticate, authorizeRole(['PARENT']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fullName, childClass, location, budget, preferredTiming, teachingMode } = req.body;
    
    const parseJsonArray = (val: any) => {
      if (!val) return [];
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return val.trim() ? [val] : [];
        }
      }
      return Array.isArray(val) ? val : [val];
    };

    const parsedTeachingMode = parseJsonArray(teachingMode);

    const profile = await prisma.parentProfile.upsert({
      where: { userId: req.user!.id },
      update: {
        fullName,
        childClass,
        location,
        budget: parseFloat(budget) || 0,
        preferredTiming,
        teachingMode: parsedTeachingMode
      },
      create: {
        userId: req.user!.id,
        fullName,
        childClass,
        location,
        budget: parseFloat(budget) || 0,
        preferredTiming,
        teachingMode: parsedTeachingMode
      }
    });

    res.status(200).json({ message: 'Profile updated successfully', profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Select Teacher
router.post('/select', authenticate, authorizeRole(['PARENT']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teacherId, paymentType } = req.body; // paymentType: 'OWN_RISK' or 'PLATFORM_PAY'
    
    const parentProfile = await prisma.parentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!parentProfile) {
      res.status(400).json({ error: 'Please complete your profile first' });
      return;
    }

    // Check if selection already exists
    const existing = await prisma.teacherSelection.findFirst({
      where: {
        parentId: parentProfile.id,
        teacherId
      }
    });

    if (existing) {
      res.status(400).json({ error: 'You have already selected this teacher.' });
      return;
    }

    // If 'OWN_RISK', accept immediately. If 'PLATFORM_PAY', set to PENDING (requires payment verification)
    const initialStatus = paymentType === 'OWN_RISK' ? 'ACCEPTED' : 'PENDING';

    const selection = await prisma.teacherSelection.create({
      data: {
        parentId: parentProfile.id,
        teacherId,
        status: initialStatus,
        paymentType
      }
    });

    // Notify Teacher
    const teacherProfile = await prisma.teacherProfile.findUnique({ where: { id: teacherId } });
    if (teacherProfile) {
      await prisma.notification.create({
        data: {
          userId: teacherProfile.userId,
          message: `A parent (${parentProfile.fullName}) has selected you for inquiries. Check your dashboard.`
        }
      });
    }

    res.status(200).json({ message: 'Teacher selected successfully', selection });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get parent selections
router.get('/selections', authenticate, authorizeRole(['PARENT']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parentProfile = await prisma.parentProfile.findUnique({ where: { userId: req.user!.id } });
    if (!parentProfile) {
      res.status(400).json({ error: 'Please complete your profile first' });
      return;
    }

    const selections = await prisma.teacherSelection.findMany({
      where: { parentId: parentProfile.id },
      include: {
        teacher: {
          include: {
            user: {
              select: { id: true, email: true, phoneNo: true }
            },
            subjects: {
              include: { subject: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(selections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

