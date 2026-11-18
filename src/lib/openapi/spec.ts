/* OpenAPI 3.0 — esr-web-frontend /api/* + Flask JSON APIs (MY-esr excluded). */

const err = { type: 'object', properties: { error: { type: 'string' } } }
const json = { type: 'object', additionalProperties: true }
const arr = { type: 'array', items: json }

function op(
  summary: string,
  opts: {
    method: string
    tags: string[]
    security?: Record<string, string[]>[]
    admin?: boolean
    parameters?: object[]
    requestBody?: object
    responses?: object
  }
) {
  const responses = opts.responses || {
    '200': { description: 'OK', content: { 'application/json': { schema: json } } },
    '401': { description: 'Unauthorized', content: { 'application/json': { schema: err } } },
  }
  return {
    [opts.method.toLowerCase()]: {
      summary,
      tags: opts.tags,
      ...(opts.admin ? { 'x-admin-only': true } : {}),
      ...(opts.security !== undefined ? { security: opts.security } : {}),
      ...(opts.parameters ? { parameters: opts.parameters } : {}),
      ...(opts.requestBody ? { requestBody: opts.requestBody } : {}),
      responses,
    },
  }
}

const bearer: Record<string, string[]>[] = [{ bearerAuth: [] }]
const publicSec: Record<string, string[]>[] = []

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ESR Restaurant API',
    version: '1.0.0',
    description:
      'JSON REST API for the ESR mobile and web clients. Authenticate with `Authorization: Bearer <access_token>` from Supabase or `/api/auth/login`. Flask admin live endpoints use cookie session unless proxied.',
  },
  servers: [
    { url: 'https://esr-web-frontend.vercel.app', description: 'Next.js production (Vercel team esr6)' },
    { url: 'http://localhost:3000', description: 'Next.js local' },
    { url: 'https://esr-flask-admin.vercel.app', description: 'Flask admin JSON APIs (if deployed)' },
    { url: 'http://localhost:5000', description: 'Flask admin local' },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Profile' },
    { name: 'Me' },
    { name: 'Devices' },
    { name: 'Restaurants' },
    { name: 'Offers' },
    { name: 'Coupons' },
    { name: 'Reviews' },
    { name: 'Wishlist' },
    { name: 'Feed' },
    { name: 'Ads' },
    { name: 'Admin' },
    { name: 'Meta' },
    { name: 'Flask' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase access_token',
      },
      flaskSession: {
        type: 'apiKey',
        in: 'cookie',
        name: 'session',
        description: 'Flask admin session cookie after /login',
      },
    },
    schemas: {
      Error: err,
      SessionTokens: {
        type: 'object',
        properties: {
          access_token: { type: 'string' },
          refresh_token: { type: 'string' },
          expires_in: { type: 'integer' },
          token_type: { type: 'string', example: 'bearer' },
          user: json,
        },
      },
    },
  },
  paths: {
    '/api/auth/login': {
      ...op('Email/password login (mobile-friendly)', {
        method: 'POST',
        tags: ['Auth'],
        security: publicSec,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Session', content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionTokens' } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: err } } },
        },
      }),
    },
    '/api/auth/signup': {
      ...op('Register account', {
        method: 'POST',
        tags: ['Auth'],
        security: publicSec,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                  full_name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: json } } } },
      }),
    },
    '/api/auth/refresh': {
      ...op('Refresh access token', {
        method: 'POST',
        tags: ['Auth'],
        security: publicSec,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refresh_token'],
                properties: { refresh_token: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'New session', content: { 'application/json': { schema: { $ref: '#/components/schemas/SessionTokens' } } } } },
      }),
    },
    '/api/auth/logout': {
      ...op('Sign out (optional Bearer + refresh_token body)', {
        method: 'POST',
        tags: ['Auth'],
        security: bearer,
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { refresh_token: { type: 'string' } } },
            },
          },
        },
      }),
    },
    '/api/profile': {
      ...op('Current user profile', { method: 'GET', tags: ['Profile'], security: bearer }),
      ...op('Update profile', {
        method: 'PUT',
        tags: ['Profile'],
        security: bearer,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  full_name: { type: 'string' },
                  phone: { type: 'string' },
                  location: { type: 'string' },
                  image_url: { type: 'string' },
                },
              },
            },
          },
        },
      }),
    },
    '/api/me/vouchers': {
      ...op('My claimed vouchers', {
        method: 'GET',
        tags: ['Me'],
        security: bearer,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
      }),
    },
    '/api/me/reviews': {
      ...op('My reviews', {
        method: 'GET',
        tags: ['Me'],
        security: bearer,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
      }),
    },
    '/api/devices/register': {
      ...op('Register push notification device', {
        method: 'POST',
        tags: ['Devices'],
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['push_token'],
                properties: {
                  push_token: { type: 'string' },
                  platform: { type: 'string', example: 'ios' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Registered', content: { 'application/json': { schema: json } } } },
      }),
    },
    '/api/restaurants': {
      ...op('List restaurants', {
        method: 'GET',
        tags: ['Restaurants'],
        security: publicSec,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'offset', in: 'query', schema: { type: 'integer' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
      }),
      ...op('Create restaurant', { method: 'POST', tags: ['Restaurants'], security: bearer }),
    },
    '/api/restaurants/featured': { ...op('Featured restaurants', { method: 'GET', tags: ['Restaurants'], security: publicSec }) },
    '/api/restaurants/top-rated': { ...op('Top rated restaurants', { method: 'GET', tags: ['Restaurants'], security: publicSec }) },
    '/api/restaurants/nearby': {
      ...op('Nearby restaurants & offers', {
        method: 'GET',
        tags: ['Restaurants'],
        security: publicSec,
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'lng', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'mode', in: 'query', schema: { type: 'string', default: 'nearby' } },
        ],
        responses: {
          '200': { description: 'Nearby payload', content: { 'application/json': { schema: json } } },
          '400': { description: 'Missing lat/lng', content: { 'application/json': { schema: err } } },
        },
      }),
    },
    '/api/restaurants/photo': {
      ...op('Restaurant photo proxy', {
        method: 'GET',
        tags: ['Restaurants'],
        security: publicSec,
        parameters: [{ name: 'name', in: 'query', schema: { type: 'string' } }],
      }),
    },
    '/api/restaurants/{id}': {
      ...op('Get restaurant', {
        method: 'GET',
        tags: ['Restaurants'],
        security: publicSec,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
      ...op('Update restaurant', {
        method: 'PUT',
        tags: ['Restaurants'],
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
      ...op('Delete restaurant', {
        method: 'DELETE',
        tags: ['Restaurants'],
        security: bearer,
        admin: true,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
    },
    '/api/offers': {
      ...op('List offers', {
        method: 'GET',
        tags: ['Offers'],
        security: publicSec,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
      }),
      ...op('Create offer', { method: 'POST', tags: ['Offers'], security: bearer }),
    },
    '/api/offers/featured': { ...op('Featured offers', { method: 'GET', tags: ['Offers'], security: publicSec }) },
    '/api/offers/bumper': { ...op('Bumper offers', { method: 'GET', tags: ['Offers'], security: publicSec }) },
    '/api/offers/by-restaurant/{restaurantId}': {
      ...op('Offers by restaurant', {
        method: 'GET',
        tags: ['Offers'],
        security: publicSec,
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
    },
    '/api/offers/{id}': {
      ...op('Get offer', {
        method: 'GET',
        tags: ['Offers'],
        security: publicSec,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
      ...op('Update offer', {
        method: 'PUT',
        tags: ['Offers'],
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
      ...op('Delete offer', {
        method: 'DELETE',
        tags: ['Offers'],
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
    },
    '/api/coupons/claim': {
      ...op('Claim voucher for offer', {
        method: 'POST',
        tags: ['Coupons'],
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['offer_id'],
                properties: { offer_id: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Claimed', content: { 'application/json': { schema: json } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: err } } },
        },
      }),
    },
    '/api/coupons/apply': {
      ...op('Apply coupon code at checkout', {
        method: 'POST',
        tags: ['Coupons'],
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'coupon_offer'],
                properties: { code: { type: 'string' }, coupon_offer: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Applied', content: { 'application/json': { schema: json } } },
          '422': { description: 'Not applicable', content: { 'application/json': { schema: json } } },
        },
      }),
    },
    '/api/coupons/{offerId}': {
      ...op('Coupons for offer', {
        method: 'GET',
        tags: ['Coupons'],
        security: bearer,
        parameters: [{ name: 'offerId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
      ...op('Create coupon for offer', {
        method: 'POST',
        tags: ['Coupons'],
        security: bearer,
        parameters: [{ name: 'offerId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
    },
    '/api/reviews': {
      ...op('List reviews', {
        method: 'GET',
        tags: ['Reviews'],
        security: publicSec,
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
      }),
      ...op('Create review', { method: 'POST', tags: ['Reviews'], security: bearer }),
    },
    '/api/reviews/popular': { ...op('Popular reviews', { method: 'GET', tags: ['Reviews'], security: publicSec }) },
    '/api/reviews/by-restaurant/{restaurantId}': {
      ...op('Reviews for restaurant', {
        method: 'GET',
        tags: ['Reviews'],
        security: publicSec,
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
    },
    '/api/reviews/{id}': {
      ...op('Get review', {
        method: 'GET',
        tags: ['Reviews'],
        security: publicSec,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
      ...op('Update review', {
        method: 'PUT',
        tags: ['Reviews'],
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
      ...op('Delete review', {
        method: 'DELETE',
        tags: ['Reviews'],
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
    },
    '/api/reviews/{id}/like': {
      ...op('Like/unlike review', {
        method: 'POST',
        tags: ['Reviews'],
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
    },
    '/api/reviews/{id}/comments': {
      ...op('List comments', {
        method: 'GET',
        tags: ['Reviews'],
        security: publicSec,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
      ...op('Add comment', {
        method: 'POST',
        tags: ['Reviews'],
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
    },
    '/api/wishlist': {
      ...op('My wishlist', { method: 'GET', tags: ['Wishlist'], security: bearer }),
      ...op('Add to wishlist', {
        method: 'POST',
        tags: ['Wishlist'],
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['offer_id'],
                properties: { offer_id: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
      }),
    },
    '/api/wishlist/{offerId}': {
      ...op('Remove from wishlist', {
        method: 'DELETE',
        tags: ['Wishlist'],
        security: bearer,
        parameters: [{ name: 'offerId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
    },
    '/api/feed/stories': {
      ...op('Foodie stories feed', { method: 'GET', tags: ['Feed'], security: publicSec }),
      ...op('Post story', { method: 'POST', tags: ['Feed'], security: bearer }),
    },
    '/api/ads': {
      ...op('Active ads', { method: 'GET', tags: ['Ads'], security: publicSec }),
      ...op('Create ad', { method: 'POST', tags: ['Ads'], security: bearer, admin: true }),
    },
    '/api/tags/{restaurantId}': {
      ...op('Tags for restaurant', {
        method: 'GET',
        tags: ['Restaurants'],
        security: publicSec,
        parameters: [{ name: 'restaurantId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      }),
    },
    '/api/version': {
      ...op('App version info', { method: 'GET', tags: ['Meta'], security: publicSec, responses: { '200': { description: 'Versions', content: { 'application/json': { schema: arr } } } } }),
      ...op('Create version row', { method: 'POST', tags: ['Meta'], security: bearer, admin: true }),
    },
    '/api/admin/analytics': {
      ...op('Admin analytics dashboard', { method: 'GET', tags: ['Admin'], security: bearer, admin: true, responses: { '403': { description: 'Forbidden', content: { 'application/json': { schema: err } } } } }),
    },
    '/api/admin/users': {
      ...op('List users', { method: 'GET', tags: ['Admin'], security: bearer, admin: true }),
      ...op('Update user role', {
        method: 'PUT',
        tags: ['Admin'],
        security: bearer,
        admin: true,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user_id: { type: 'string', format: 'uuid' },
                  role: { type: 'string', enum: ['customer', 'owner', 'admin'] },
                  restaurant_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
      }),
    },
    '/api/admin/discount-availed': {
      ...op('Discount availed report', {
        method: 'GET',
        tags: ['Admin'],
        security: bearer,
        admin: true,
        parameters: [
          { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
      }),
    },
    '/api/health': {
      ...op('Flask admin health', {
        method: 'GET',
        tags: ['Flask'],
        security: publicSec,
        responses: {
          '200': {
            description: 'Online',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string' }, message: { type: 'string' } },
                },
              },
            },
          },
        },
      }),
    },
    '/api/live/pulse': {
      ...op('Live admin stats', {
        method: 'GET',
        tags: ['Flask'],
        security: [{ flaskSession: [] }],
        admin: true,
        responses: { '200': { description: 'Pulse payload', content: { 'application/json': { schema: json } } } },
      }),
    },
    '/api/live/vouchers': {
      ...op('Live claimed vouchers', {
        method: 'GET',
        tags: ['Flask'],
        security: [{ flaskSession: [] }],
        admin: true,
      }),
    },
  },
} as const
