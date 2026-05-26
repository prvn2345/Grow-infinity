import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jwt-simple';
import prisma from '../prismaClient';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, role, username, phoneNo, parentDetails, teacherDetails } = req.body;
    
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email or username already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        phoneNo,
        password: hashedPassword,
        role,
        ...(role === 'PARENT' && parentDetails ? {
          parentProfile: {
            create: {
              fullName: parentDetails.fullName,
              childName: parentDetails.childName,
              group: parentDetails.group,
              subGroup: parentDetails.subGroup,
            }
          }
        } : {}),
        ...(role === 'TEACHER' && teacherDetails ? {
          teacherProfile: {
            create: {
              fullName: teacherDetails.fullName,
              qualifications: [teacherDetails.qualifications],
              group: teacherDetails.group,
              subGroup: teacherDetails.subGroup,
            }
          }
        } : {})
      }
    });

    if (role === 'TEACHER' && teacherDetails && teacherDetails.subjects && teacherDetails.subjects.length > 0) {
      const profile = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
      if (profile) {
        // Ensure subjects exist
        const subjectRecords = await Promise.all(
          teacherDetails.subjects.map(async (name: string) => {
            let subject = await prisma.subject.findUnique({ where: { name } });
            if (!subject) subject = await prisma.subject.create({ data: { name } });
            return subject;
          })
        );
        await prisma.teacherSubject.createMany({
          data: subjectRecords.map(s => ({ teacherId: profile.id, subjectId: s.id }))
        });
      }
    }

    res.status(201).json({ message: 'User registered successfully', user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.encode({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
