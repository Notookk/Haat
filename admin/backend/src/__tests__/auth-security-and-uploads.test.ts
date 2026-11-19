import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createUploadSignature,
  isCloudinaryConfigured,
  extractCloudinaryPublicId,
  deleteCloudinaryCategoryImage,
  signAccessToken,
  revokeAccessToken,
  isAccessTokenRevoked,
  requireAuth,
  AppError,
  env,
} from '@haat/shared-backend';
import { ERROR_CODES } from '@haat/shared-contracts';

describe('Cloudinary Direct Upload Configuration & Sequential Naming', () => {
  it('confirms Cloudinary is properly configured with environment credentials', () => {
    assert.equal(isCloudinaryConfigured(), true);
    assert.equal(env.CLOUDINARY_CLOUD_NAME, 'jyxualyk');
    assert.equal(env.CLOUDINARY_API_KEY, '299214388635625');
  });

  it('generates upload signature for folder Haat and publicId <userId>_<number>', async () => {
    const testUserId = '6afeacc4e34b09ef5a820acd';
    const upload = await createUploadSignature(testUserId);

    assert.equal(upload.cloudName, 'jyxualyk');
    assert.equal(upload.apiKey, '299214388635625');
    assert.equal(upload.folder, 'Haat');
    assert.match(upload.publicId, new RegExp(`^${testUserId}_\\d{3,}$`));
    assert.ok(upload.signature.length > 20);
    assert.equal(upload.uploadUrl, 'https://api.cloudinary.com/v1_1/jyxualyk/image/upload');

    // Asserts no upload preset exists
    assert.equal((upload as any).uploadPreset, undefined);
  });
});

describe('JWT Revocation on Logout Lifecycle', () => {
  it('allows access with a valid newly-issued JWT access token', async () => {
    const token = signAccessToken({ userId: '6afeacc4e34b09ef5a820acd', role: 'ADMIN' });
    const req = {
      header: (name: string) => (name.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined),
    } as any;

    let nextCalled = false;
    let nextError: any = null;

    await requireAuth(req, {} as any, (err?: any) => {
      nextCalled = true;
      nextError = err;
    });

    assert.equal(nextCalled, true);
    assert.equal(nextError, undefined);
    assert.equal(req.user?.userId, '6afeacc4e34b09ef5a820acd');
    assert.equal(req.user?.role, 'ADMIN');
  });

  it('immediately expires / revokes the JWT access token upon logout', async () => {
    const token = signAccessToken({ userId: '6afeacc4e34b09ef5a820acd', role: 'ADMIN' });

    // Verify token is initially not revoked
    const initiallyRevoked = await isAccessTokenRevoked(token);
    assert.equal(initiallyRevoked, false);

    // Perform logout revocation
    await revokeAccessToken(token, '6afeacc4e34b09ef5a820acd');

    // Token must now be revoked
    const nowRevoked = await isAccessTokenRevoked(token);
    assert.equal(nowRevoked, true);

    // requireAuth must now reject this token with 401 TOKEN_INVALID
    const req = {
      header: (name: string) => (name.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined),
    } as any;

    let nextError: any = null;
    await requireAuth(req, {} as any, (err?: any) => {
      nextError = err;
    });

    assert.ok(nextError instanceof AppError);
    assert.equal(nextError.statusCode, 401);
    assert.equal(nextError.code, ERROR_CODES.TOKEN_INVALID);
  });
});

describe('Cloudinary Asset Lifecycle & Category Image Cleanup', () => {
  it('correctly extracts publicId from both raw publicId strings and full Cloudinary URLs', () => {
    assert.equal(extractCloudinaryPublicId('Haat/user123_001'), 'Haat/user123_001');
    assert.equal(
      extractCloudinaryPublicId('https://res.cloudinary.com/jyxualyk/image/upload/v1732034000/Haat/user123_001.webp'),
      'Haat/user123_001',
    );
    assert.equal(
      extractCloudinaryPublicId('https://res.cloudinary.com/jyxualyk/image/upload/categories/dairy-products.jpg'),
      'categories/dairy-products',
    );
    assert.equal(extractCloudinaryPublicId(null), null);
    assert.equal(extractCloudinaryPublicId(''), null);
  });

  it('safely handles category image deletion requests without throwing errors', async () => {
    // Calling deleteCloudinaryCategoryImage with valid publicId or URL completes safely
    await assert.doesNotReject(async () => {
      await deleteCloudinaryCategoryImage('Haat/test_mock_category_001');
    });

    await assert.doesNotReject(async () => {
      await deleteCloudinaryCategoryImage(
        null,
        'https://res.cloudinary.com/jyxualyk/image/upload/v1732034000/Haat/test_category.png',
      );
    });

    await assert.doesNotReject(async () => {
      await deleteCloudinaryCategoryImage(null, null);
    });
  });
});
