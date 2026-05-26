import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

// Get chat history with another user
router.get('/:receiverId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const senderId = req.user!.id;
    const receiverId = req.params.receiverId as string;

    // Check if there is an accepted selection between the two users
    const selection = await prisma.teacherSelection.findFirst({
      where: {
        OR: [
          {
            parent: { userId: senderId },
            teacher: { userId: receiverId }
          },
          {
            parent: { userId: receiverId },
            teacher: { userId: senderId }
          }
        ]
      },
      include: {
        teacher: true,
        parent: true
      }
    });

    if (!selection || selection.status !== 'ACCEPTED') {
      res.status(403).json({ error: 'Chat is only available for accepted tutoring requests.' });
      return;
    }

    // If logged-in user is the teacher, verify they have paid subscription and uploaded demo lecture
    if (req.user!.role === 'TEACHER') {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: senderId }
      });
      if (!teacherProfile || !teacherProfile.hasActiveSub || !teacherProfile.demoLectureUrl) {
        res.status(403).json({ error: 'Please pay the subscription and upload a demo lecture to start chatting.' });
        return;
      }
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message to another user
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const senderId = req.user!.id;
    const { receiverId, content } = req.body;

    if (!content || content.trim() === '') {
      res.status(400).json({ error: 'Message content cannot be empty' });
      return;
    }

    // Check if tutoring request is accepted
    const selection = await prisma.teacherSelection.findFirst({
      where: {
        OR: [
          {
            parent: { userId: senderId },
            teacher: { userId: receiverId }
          },
          {
            parent: { userId: receiverId },
            teacher: { userId: senderId }
          }
        ]
      },
      include: {
        teacher: true,
        parent: true
      }
    });

    if (!selection || selection.status !== 'ACCEPTED') {
      res.status(403).json({ error: 'Chat is only available for accepted tutoring requests.' });
      return;
    }

    // If sender is teacher, verify formalities are complete
    if (req.user!.role === 'TEACHER') {
      const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: senderId }
      });
      if (!teacherProfile || !teacherProfile.hasActiveSub || !teacherProfile.demoLectureUrl) {
        res.status(403).json({ error: 'Please complete all formalities (subscription + demo lecture) to chat.' });
        return;
      }
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
