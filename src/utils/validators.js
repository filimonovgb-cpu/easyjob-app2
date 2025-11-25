import { z } from 'zod';

export const phoneRegex = /^\+?[0-9]{10,15}$/;

export const registrationSchema = z.object({
  firstName: z.string().min(2, 'errorFillFields'),
  lastName: z.string().min(2, 'errorFillFields'),
  phone: z.string().regex(phoneRegex, 'errorInvalidPhone'),
  categoryId: z.string().min(1, 'errorFillFields'),
  photo: z.string().min(1, 'errorUploadPhoto'),
  agreeData: z.boolean().refine(val => val === true, 'errorAcceptTerms'),
  acceptTerms: z.boolean().refine(val => val === true, 'errorAcceptTerms')
});

export const orderSchema = z.object({
  address: z.string().min(3, 'errorFillFields'),
  description: z.string().min(10, 'errorFillFields'),
  date: z.date(),
  time: z.string().min(1, 'errorFillFields')
});

export const smsCodeSchema = z.object({
  code: z.string().length(6, 'errorInvalidSms')
});

export const validatePhone = (phone) => {
  return phoneRegex.test(phone);
};

export const validateSmsCode = (code) => {
  return /^\d{6}$/.test(code);
};
