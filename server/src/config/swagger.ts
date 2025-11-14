import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

// Jest 환경에서는 process.cwd() 사용
const swaggerBaseDir = process.env.NODE_ENV === 'test' 
  ? process.cwd()
  : path.join(process.cwd(), 'src');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BrandVault API',
      version: '1.0.0',
      description: 'BrandVault 백엔드 API 문서',
      contact: {
        name: 'BrandVault API Support',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'API 서버',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'jwt',
          description: 'JWT 토큰이 HttpOnly 쿠키로 설정됩니다',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: '에러 메시지',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: '성공 메시지',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: '인증 관련 API',
      },
      {
        name: 'Products',
        description: '제품 관련 API',
      },
      {
        name: 'Projects',
        description: '프로젝트 관련 API',
      },
      {
        name: 'Brands',
        description: '브랜드 관련 API',
      },
      {
        name: 'Splat',
        description: '3D Splat 관련 API',
      },
      {
        name: 'Files',
        description: '파일 업로드/다운로드 API',
      },
    ],
  },
  apis: [
    path.join(swaggerBaseDir, 'routes/*.{ts,js}'),
    path.join(swaggerBaseDir, 'controllers/*.{ts,js}'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
