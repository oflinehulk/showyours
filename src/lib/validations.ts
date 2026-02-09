import { z } from 'zod';

// Profile form validation
export const profileSchema = z.object({
  ign: z.string()
    .trim()
    .min(1, 'IGN is required')
    .max(30, 'IGN must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_\s.-]+$/, 'IGN can only contain letters, numbers, spaces, and .-_'),
  mlbbId: z.string()
    .trim()
    .max(20, 'MLBB ID must be less than 20 characters')
    .regex(/^[0-9]*$/, 'MLBB ID must contain only numbers')
    .optional()
    .or(z.literal('')),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  winRate: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    }, 'Win rate must be between 0 and 100'),
  whatsapp: z.string()
    .trim()
    .min(1, 'WhatsApp is required')
    .max(20, 'Phone number too long')
    .regex(/^[+\d\s-]+$/, 'Invalid phone number format'),
  gameId: z.string()
    .trim()
    .min(1, 'Game ID is required')
    .max(30, 'Game ID too long'),
  discord: z.string()
    .max(50, 'Discord too long')
    .optional()
    .or(z.literal('')),
  instagram: z.string()
    .max(50, 'Instagram too long')
    .optional()
    .or(z.literal('')),
});

// Squad form validation
export const squadSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Squad name is required')
    .max(50, 'Squad name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_\s.-]+$/, 'Squad name can only contain letters, numbers, spaces, and .-_'),
  description: z.string()
    .trim()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters'),
  whatsapp: z.string()
    .trim()
    .min(1, 'WhatsApp is required')
    .max(20, 'Phone number too long')
    .regex(/^[+\d\s-]+$/, 'Invalid phone number format'),
  discord: z.string()
    .max(100, 'Discord URL too long')
    .optional()
    .or(z.literal('')),
});

// Application message validation
export const applicationSchema = z.object({
  message: z.string()
    .max(500, 'Message must be less than 500 characters')
    .optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type SquadFormData = z.infer<typeof squadSchema>;
export type ApplicationFormData = z.infer<typeof applicationSchema>;
