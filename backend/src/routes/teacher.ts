import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticate, authorizeRole, AuthRequest } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

// Create / Update Teacher Profile
router.post(
  '/profile',
  authenticate,
  authorizeRole(['TEACHER']),
  upload.fields([
    { name: 'documents', maxCount: 5 },
    { name: 'demoLecture', maxCount: 1 }
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { fullName, qualifications, experience, location, hourlyFee, teachingMode, subjects } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      const documentsUrl = files['documents']?.map(file => file.path) || [];
      const demoLectureUrl = files['demoLecture']?.[0]?.path || null;

      const parsedQualifications = typeof qualifications === 'string' ? JSON.parse(qualifications) : qualifications;
      const parsedTeachingMode = typeof teachingMode === 'string' ? JSON.parse(teachingMode) : teachingMode;
      const parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects; // Array of subject names
      
      // Ensure subjects exist
      const subjectRecords = await Promise.all(
        (parsedSubjects || []).map(async (name: string) => {
          let subject = await prisma.subject.findUnique({ where: { name } });
          if (!subject) {
            subject = await prisma.subject.create({ data: { name } });
          }
          return subject;
        })
      );

      const profile = await prisma.teacherProfile.upsert({
        where: { userId: req.user!.id },
        update: {
          fullName,
          qualifications: parsedQualifications,
          experience: parseInt(experience),
          location,
          hourlyFee: parseFloat(hourlyFee),
          teachingMode: parsedTeachingMode,
          ...(documentsUrl.length && { documentsUrl }),
          ...(demoLectureUrl && { demoLectureUrl })
        },
        create: {
          userId: req.user!.id,
          fullName,
          qualifications: parsedQualifications,
          experience: parseInt(experience),
          location,
          hourlyFee: parseFloat(hourlyFee),
          teachingMode: parsedTeachingMode,
          documentsUrl,
          demoLectureUrl
        }
      });

      // Update TeacherSubject relations
      await prisma.teacherSubject.deleteMany({ where: { teacherId: profile.id } });
      await prisma.teacherSubject.createMany({
        data: subjectRecords.map(s => ({ teacherId: profile.id, subjectId: s.id }))
      });

      res.status(200).json({ message: 'Profile updated successfully', profile });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get Teacher Profile
router.get('/profile', authenticate, authorizeRole(['TEACHER']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: req.user!.id },
      include: { subjects: { include: { subject: true } } }
    });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List Teachers (For Parents)
router.get('/', authenticate, authorizeRole(['PARENT', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, location, minFee, maxFee } = req.query;

    const filters: any = { isApproved: true };

    if (location) filters.location = { contains: String(location), mode: 'insensitive' };
    if (minFee || maxFee) {
      filters.hourlyFee = {};
      if (minFee) filters.hourlyFee.gte = parseFloat(String(minFee));
      if (maxFee) filters.hourlyFee.lte = parseFloat(String(maxFee));
    }
    
    // Actually we only show limited details if the parent is not subbed, 
    // but the DB query just gets them all.
    const teachers = await prisma.teacherProfile.findMany({
      where: filters,
      include: {
        subjects: { include: { subject: true } },
        reviews: true
      }
    });

    // Filter by subject if provided
    let result = teachers;
    if (subject) {
      result = result.filter(t => t.subjects.some(ts => ts.subject.name.toLowerCase().includes(String(subject).toLowerCase())));
    }

    // Remove sensitive info (like exact contact, but profile model doesn't have it anyway right now)
    const sanitizedResult = result.map(t => ({
      id: t.id,
      fullName: t.fullName,
      experience: t.experience,
      location: t.location,
      hourlyFee: t.hourlyFee,
      demoLectureUrl: t.demoLectureUrl,
      subjects: t.subjects.map(s => s.subject.name),
      rating: t.reviews.length > 0 ? t.reviews.reduce((a, b) => a + b.rating, 0) / t.reviews.length : 0,
      totalReviews: t.reviews.length
    }));

    res.json(sanitizedResult);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch inquiries (selections) for this teacher
router.get('/selections', authenticate, authorizeRole(['TEACHER']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!teacherProfile) {
      res.status(404).json({ error: 'Teacher profile not found' });
      return;
    }

    const selections = await prisma.teacherSelection.findMany({
      where: { teacherId: teacherProfile.id },
      include: {
        parent: {
          include: {
            user: {
              select: { id: true, email: true, phoneNo: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Check locking criteria: has active subscription AND has uploaded demo lecture
    const unlocked = teacherProfile.hasActiveSub && !!teacherProfile.demoLectureUrl;

    const result = selections.map(sel => {
      if (unlocked) {
        return {
          id: sel.id,
          status: sel.status,
          paymentType: sel.paymentType,
          paymentId: sel.paymentId,
          createdAt: sel.createdAt,
          unlocked: true,
          parent: {
            id: sel.parent.id,
            userId: sel.parent.user.id,
            fullName: sel.parent.fullName,
            childName: sel.parent.childName,
            childClass: sel.parent.childClass,
            location: sel.parent.location,
            budget: sel.parent.budget,
            preferredTiming: sel.parent.preferredTiming,
            teachingMode: sel.parent.teachingMode,
            email: sel.parent.user.email,
            phoneNo: sel.parent.user.phoneNo
          }
        };
      } else {
        // Redacted details
        return {
          id: sel.id,
          status: sel.status,
          paymentType: sel.paymentType,
          paymentId: sel.paymentId,
          createdAt: sel.createdAt,
          unlocked: false,
          parent: {
            id: sel.parent.id,
            fullName: 'Locked Parent Profile',
            childName: 'Locked Child Name',
            childClass: sel.parent.childClass,
            location: 'Locked Location',
            budget: null,
            preferredTiming: sel.parent.preferredTiming,
            teachingMode: sel.parent.teachingMode,
            email: 'locked@platform.com',
            phoneNo: '##########'
          }
        };
      }
    });

    res.json({
      unlocked,
      checklist: {
        hasSubscription: teacherProfile.hasActiveSub,
        hasDemoLecture: !!teacherProfile.demoLectureUrl
      },
      selections: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dedicated demo lecture upload/link route
router.post(
  '/demo-lecture',
  authenticate,
  authorizeRole(['TEACHER']),
  upload.single('demoLecture'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: req.user!.id }
      });

      if (!teacherProfile) {
        res.status(404).json({ error: 'Teacher profile not found' });
        return;
      }

      let demoLectureUrl = req.body.demoLectureUrl || null;
      if (req.file) {
        // File uploaded
        demoLectureUrl = `http://localhost:5000/uploads/${req.file.filename}`;
      }

      if (!demoLectureUrl) {
        res.status(400).json({ error: 'Please upload a file or provide a video URL link.' });
        return;
      }

      const updated = await prisma.teacherProfile.update({
        where: { id: teacherProfile.id },
        data: { demoLectureUrl }
      });

      res.json({ message: 'Demo lecture updated successfully', profile: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
