import { Router, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '../prismaClient';
import { authenticate, authorizeRole, AuthRequest } from '../middlewares/auth';

const router = Router();

const razorpay = process.env.RAZORPAY_KEY_ID
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET || ''
    })
  : null;

// Create Razorpay Order
router.post('/order', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!razorpay) {
      res.status(503).json({ error: 'Payment gateway not configured. Please add Razorpay keys.' });
      return;
    }
    const { amount, purpose } = req.body; // e.g. amount in INR, purpose: 'TEACHER_SUBSCRIPTION' or 'PLATFORM_PAY'
    
    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json({ order, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify Payment
router.post('/verify', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purpose, metadata } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || '')
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    if (purpose === 'TEACHER_SUBSCRIPTION' && req.user?.role === 'TEACHER') {
      const profile = await prisma.teacherProfile.findUnique({ where: { userId: req.user.id } });
      if (profile) {
        await prisma.teacherProfile.update({
          where: { id: profile.id },
          data: { hasActiveSub: true }
        });
      }
    } else if (purpose === 'PLATFORM_PAY' && req.user?.role === 'PARENT') {
      // metadata contains teacherSelectionId
      await prisma.teacherSelection.update({
        where: { id: metadata.selectionId },
        data: { paymentId: razorpay_payment_id, paymentType: 'PLATFORM_PAY', status: 'ACCEPTED' }
      });
    }

    res.json({ message: 'Payment verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

export default router;
