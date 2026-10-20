const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const { SurplusLot, SURPLUS_STATUS } = require('../src/models/SurplusLot');

let mongoServer;

describe('Community Food Rescue - SurplusLot API Test Suite', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await SurplusLot.deleteMany({});
  });

  // Test Organization and User IDs
  const mockOrgId = new mongoose.Types.ObjectId().toString();
  const mockUserId = new mongoose.Types.ObjectId().toString();

  const validLotPayload = {
    title: 'Surplus Sourdough & Croissants',
    description: 'Freshly baked artisanal breads and morning pastries from campus bakery.',
    quantity: 30,
    unit: 'portions',
    preparationInfo: 'Baked at 5:00 AM today in our campus bakery. Packaged in sanitized food-grade bakery containers.',
    storageInfo: 'Store in cool dry conditions. Ambient shelf life 48 hours.',
    allergenInfo: {
      status: 'CONTAINS',
      allergens: ['wheat', 'gluten', 'dairy'],
      isAllergenFree: false,
      crossContaminationRisk: 'LOW',
      details: 'Contains wheat gluten and milk. Baked in a facility that also processes tree nuts.'
    },
    pickupStart: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
    pickupEnd: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(), // 4 hours from now
    pickupZone: 'North Campus Zone 1',
    pickupAddress: {
      streetAddress: '128 University Way, Kitchen Loading Bay B',
      buildingOrRoom: 'Bakery Building Room 102',
      contactPhone: '+1-555-019-2834',
      donorNotes: 'Ring bell at Door 3, ask for Chef Marcus.'
    }
  };

  describe('1. Model Validation & Safety Rules (SurplusLot.js)', () => {
    test('CRITICAL RULE: Missing allergen information defaults to UNKNOWN, NOT allergen-free', async () => {
      const lot = new SurplusLot({
        organizationId: mockOrgId,
        createdBy: mockUserId,
        title: 'Mixed Pastries',
        description: 'Assorted baked goods from daily closing.',
        quantity: 15,
        unit: 'portions',
        preparationInfo: 'Prepared today.',
        storageInfo: 'Ambient storage.',
        // allergenInfo omitted completely!
        pickupStart: new Date(Date.now() + 1000 * 60 * 60),
        pickupEnd: new Date(Date.now() + 1000 * 60 * 60 * 3),
        pickupZone: 'Downtown Core'
      });

      const saved = await lot.save();
      assert.strictEqual(saved.allergenInfo.status, 'UNKNOWN');
      assert.strictEqual(saved.allergenInfo.isAllergenFree, false);
      assert.strictEqual(saved.allergenInfo.crossContaminationRisk, 'UNKNOWN');
      assert.match(saved.allergenInfo.details, /UNKNOWN/i);
    });

    test('Initializes remainingQuantity equal to quantity and status to AVAILABLE', async () => {
      const lot = new SurplusLot({
        organizationId: mockOrgId,
        createdBy: mockUserId,
        title: 'Vegan Soup Bowls',
        description: 'Vegetable barley soup.',
        quantity: 25,
        unit: 'servings',
        preparationInfo: 'Cooked at 11 AM.',
        storageInfo: 'Keep refrigerated below 4°C.',
        pickupStart: new Date(Date.now() + 1000 * 60 * 60),
        pickupEnd: new Date(Date.now() + 1000 * 60 * 60 * 2),
        pickupZone: 'South Quad'
      });

      const saved = await lot.save();
      assert.strictEqual(saved.remainingQuantity, 25);
      assert.strictEqual(saved.status, SURPLUS_STATUS.AVAILABLE);
    });

    test('Rejects lot if pickupEnd is earlier than or equal to pickupStart', async () => {
      const now = new Date();
      const lot = new SurplusLot({
        organizationId: mockOrgId,
        createdBy: mockUserId,
        title: 'Invalid Window Food',
        description: 'Timing invalid.',
        quantity: 10,
        unit: 'boxes',
        preparationInfo: 'Prepared recently.',
        storageInfo: 'Ambient.',
        pickupStart: new Date(now.getTime() + 5000),
        pickupEnd: new Date(now.getTime() - 5000), // In the past!
        pickupZone: 'Zone A'
      });

      await assert.rejects(async () => {
        await lot.save();
      });
    });
  });

  describe('2. POST /api/surplus', () => {
    test('Donor can successfully create a surplus listing', async () => {
      const res = await request(app)
        .post('/api/surplus')
        .set('x-user-id', mockUserId)
        .set('x-user-role', 'donor')
        .set('x-org-id', mockOrgId)
        .send(validLotPayload);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.title, validLotPayload.title);
      assert.strictEqual(res.body.data.quantity, 30);
      assert.strictEqual(res.body.data.remainingQuantity, 30);
      assert.strictEqual(res.body.data.status, 'AVAILABLE');
      assert.strictEqual(res.body.data.unit, 'portions');
      assert.strictEqual(res.body.data.pickupZone, 'North Campus Zone 1');
      // Owning donor receives full address details
      assert.strictEqual(res.body.data.pickupAddress.streetAddress, validLotPayload.pickupAddress.streetAddress);
    });

    test('Enforces UNKNOWN allergen status when donor does not specify allergens', async () => {
      const payloadWithoutAllergen = { ...validLotPayload };
      delete payloadWithoutAllergen.allergenInfo;

      const res = await request(app)
        .post('/api/surplus')
        .set('x-user-id', mockUserId)
        .set('x-user-role', 'donor')
        .set('x-org-id', mockOrgId)
        .send(payloadWithoutAllergen);

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.allergenInfo.status, 'UNKNOWN');
      assert.strictEqual(res.body.data.allergenInfo.isAllergenFree, false);
      assert.match(res.body.data.allergenInfo.details, /UNKNOWN/i);
    });

    test('Rejects request if unauthenticated', async () => {
      const res = await request(app)
        .post('/api/surplus')
        .send(validLotPayload);

      assert.strictEqual(res.status, 401);
    });

    test('Rejects request if user has unauthorized role (e.g. volunteer)', async () => {
      const res = await request(app)
        .post('/api/surplus')
        .set('x-user-id', mockUserId)
        .set('x-user-role', 'volunteer')
        .set('x-org-id', mockOrgId)
        .send(validLotPayload);

      assert.strictEqual(res.status, 403);
    });

    test('Rejects request if donor organization is not verified', async () => {
      const res = await request(app)
        .post('/api/surplus')
        .set('x-user-id', mockUserId)
        .set('x-user-role', 'donor')
        .set('x-org-id', mockOrgId)
        .set('x-user-verified', 'false')
        .send(validLotPayload);

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message, /verified/i);
    });
  });

  describe('3. GET /api/surplus (Public Availability and Sanitization)', () => {
    beforeEach(async () => {
      // Seed a lot with private address and contact details
      await SurplusLot.create({
        organizationId: mockOrgId,
        createdBy: mockUserId,
        title: 'Artisan Bagels',
        description: 'Dozen assorted sesame and poppy seed bagels.',
        quantity: 20,
        remainingQuantity: 20,
        unit: 'portions',
        preparationInfo: 'Prepared at 6 AM.',
        storageInfo: 'Store in dry place.',
        allergenInfo: {
          status: 'CONTAINS',
          allergens: ['gluten', 'sesame'],
          isAllergenFree: false
        },
        pickupStart: new Date(Date.now() + 1000 * 60 * 30),
        pickupEnd: new Date(Date.now() + 1000 * 60 * 60 * 5),
        pickupZone: 'Campus East',
        pickupAddress: {
          streetAddress: '742 Evergreen Terrace (Private Staff Alley Entrance)',
          buildingOrRoom: 'Basement Storage Vault',
          contactPhone: '+1-555-837-1234',
          donorNotes: 'Private door code: 9942#'
        },
        status: SURPLUS_STATUS.AVAILABLE
      });
    });

    test('CRITICAL RULE: Public users receive sanitized data without private addresses or phone numbers', async () => {
      // Unauthenticated request (Public user)
      const res = await request(app).get('/api/surplus');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.count, 1);

      const item = res.body.data[0];
      assert.strictEqual(item.title, 'Artisan Bagels');
      assert.strictEqual(item.remainingQuantity, 20);
      assert.strictEqual(item.pickupZone, 'Campus East'); // General zone allowed

      // Must NOT expose private address, phone, or door code!
      assert.strictEqual(item.pickupAddress, undefined);
      assert.strictEqual(item.contactPhone, undefined);
      assert.strictEqual(item.donorNotes, undefined);
    });

    test('Filters by pickupZone', async () => {
      const resMatch = await request(app).get('/api/surplus?pickupZone=Campus%20East');
      assert.strictEqual(resMatch.body.count, 1);

      const resNoMatch = await request(app).get('/api/surplus?pickupZone=West%20District');
      assert.strictEqual(resNoMatch.body.count, 0);
    });

    test('Auto-expires listings where pickupEnd is past', async () => {
      // Create an expired lot
      await SurplusLot.create({
        organizationId: mockOrgId,
        createdBy: mockUserId,
        title: 'Past Sandwiches',
        description: 'Deli sandwiches.',
        quantity: 10,
        remainingQuantity: 10,
        unit: 'portions',
        preparationInfo: 'Prepared yesterday.',
        storageInfo: 'Refrigerated.',
        allergenInfo: { status: 'UNKNOWN', allergens: [], isAllergenFree: false },
        pickupStart: new Date(Date.now() - 1000 * 60 * 120),
        pickupEnd: new Date(Date.now() - 1000 * 60 * 60), // ended 1 hour ago
        pickupZone: 'Campus East',
        status: SURPLUS_STATUS.AVAILABLE
      });

      // Public call should auto-mark it expired and omit from default available listings
      const res = await request(app).get('/api/surplus');
      const titles = res.body.data.map(d => d.title);
      assert.ok(!titles.includes('Past Sandwiches'));

      // If queried with status=EXPIRED
      const resExpired = await request(app).get('/api/surplus?status=EXPIRED');
      assert.strictEqual(resExpired.body.count, 1);
      assert.strictEqual(resExpired.body.data[0].status, 'EXPIRED');
    });
  });

  describe('4. GET /api/surplus/:id', () => {
    let createdLot;

    beforeEach(async () => {
      createdLot = await SurplusLot.create({
        organizationId: mockOrgId,
        createdBy: mockUserId,
        title: 'Fresh Farm Produce Crate',
        description: 'Crisp organic lettuces, carrots and radishes.',
        quantity: 40,
        remainingQuantity: 40,
        unit: 'kg',
        preparationInfo: 'Harvested yesterday, washed and crate-packed.',
        storageInfo: 'Keep chilled between 2-6°C.',
        allergenInfo: {
          status: 'NONE_DECLARED',
          allergens: [],
          isAllergenFree: true,
          details: 'Pure raw produce without added ingredients.'
        },
        pickupStart: new Date(Date.now() + 1000 * 60 * 30),
        pickupEnd: new Date(Date.now() + 1000 * 60 * 60 * 6),
        pickupZone: 'Market Plaza',
        pickupAddress: {
          streetAddress: '55 Farmer Market Row, Stall 14',
          buildingOrRoom: 'Rear Cold Storage B',
          contactPhone: '+1-555-882-9911',
          donorNotes: 'Ask for Farmhand Sarah'
        },
        status: SURPLUS_STATUS.AVAILABLE
      });
    });

    test('Public viewer gets sanitized lot without private address', async () => {
      const res = await request(app).get(`/api/surplus/${createdLot._id}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.title, 'Fresh Farm Produce Crate');
      assert.strictEqual(res.body.data.pickupAddress, undefined);
    });

    test('Donor owning the listing gets full view with pickup address', async () => {
      const res = await request(app)
        .get(`/api/surplus/${createdLot._id}`)
        .set('x-user-id', mockUserId)
        .set('x-user-role', 'donor')
        .set('x-org-id', mockOrgId);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.pickupAddress.streetAddress, '55 Farmer Market Row, Stall 14');
      assert.strictEqual(res.body.data.pickupAddress.contactPhone, '+1-555-882-9911');
    });

    test('Returns 404 for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/surplus/${fakeId}`);
      assert.strictEqual(res.status, 404);
    });
  });

  describe('5. PATCH /api/surplus/:id (Donor Listing Management)', () => {
    let createdLot;

    beforeEach(async () => {
      createdLot = await SurplusLot.create({
        organizationId: mockOrgId,
        createdBy: mockUserId,
        title: 'Original Bread Lot',
        description: 'Original description.',
        quantity: 50,
        remainingQuantity: 30, // 20 units currently reserved!
        unit: 'loaves',
        preparationInfo: 'Baked morning.',
        storageInfo: 'Dry pantry.',
        allergenInfo: {
          status: 'UNKNOWN',
          allergens: [],
          isAllergenFree: false
        },
        pickupStart: new Date(Date.now() + 1000 * 60 * 30),
        pickupEnd: new Date(Date.now() + 1000 * 60 * 60 * 6),
        pickupZone: 'Market Plaza',
        status: SURPLUS_STATUS.PARTIALLY_RESERVED
      });
    });

    test('Donor can edit listing information (title, handling, allergen details)', async () => {
      const res = await request(app)
        .patch(`/api/surplus/${createdLot._id}`)
        .set('x-user-id', mockUserId)
        .set('x-user-role', 'donor')
        .set('x-org-id', mockOrgId)
        .send({
          title: 'Corrected: Sourdough Country Loaves',
          preparationInfo: 'Updated: Baked at 6am using wild yeast culture.',
          allergenInfo: {
            status: 'CONTAINS',
            allergens: ['wheat', 'gluten'],
            isAllergenFree: false,
            details: 'Contains wheat gluten.'
          }
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.title, 'Corrected: Sourdough Country Loaves');
      assert.strictEqual(res.body.data.allergenInfo.status, 'CONTAINS');
      assert.deepStrictEqual(res.body.data.allergenInfo.allergens, ['wheat', 'gluten']);
    });

    test('Donor can adjust total quantity and remainingQuantity updates accordingly', async () => {
      // Original: quantity=50, remaining=30 (reserved=20)
      // New quantity: 60 -> remaining should become 60 - 20 = 40
      const res = await request(app)
        .patch(`/api/surplus/${createdLot._id}`)
        .set('x-user-id', mockUserId)
        .set('x-user-role', 'donor')
        .set('x-org-id', mockOrgId)
        .send({ quantity: 60 });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.quantity, 60);
      assert.strictEqual(res.body.data.remainingQuantity, 40);
    });

    test('Cannot reduce quantity below already reserved amount', async () => {
      // 20 units reserved. Reducing total quantity to 15 must fail!
      const res = await request(app)
        .patch(`/api/surplus/${createdLot._id}`)
        .set('x-user-id', mockUserId)
        .set('x-user-role', 'donor')
        .set('x-org-id', mockOrgId)
        .send({ quantity: 15 });

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /already been reserved/i);
    });

    test('Donor can cancel listing', async () => {
      const res = await request(app)
        .patch(`/api/surplus/${createdLot._id}`)
        .set('x-user-id', mockUserId)
        .set('x-user-role', 'donor')
        .set('x-org-id', mockOrgId)
        .send({ status: 'CANCELLED' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.status, 'CANCELLED');
    });

    test('Rejects edit from donor belonging to a different organization', async () => {
      const otherOrgId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/surplus/${createdLot._id}`)
        .set('x-user-id', new mongoose.Types.ObjectId().toString())
        .set('x-user-role', 'donor')
        .set('x-org-id', otherOrgId)
        .send({ title: 'Malicious Change' });

      assert.strictEqual(res.status, 403);
    });
  });
});
