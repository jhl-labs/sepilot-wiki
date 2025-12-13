/**
 * NextAuth.js API Route Handler
 * /api/auth/* 엔드포인트 처리
 */

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
