const request = require('supertest');
const express = require('express');
const app = require('./server');

jest.mock('sqlite3', () => {
  const mDb = {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    serialize: jest.fn((callback) => callback()),
  };
  return {
    verbose: jest.fn(() => ({
      Database: jest.fn(() => mDb),
    })),
  };
});

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database();

// Test suite for server.js

describe('API Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Should return an error when input is null', async () => {
    db.get.mockImplementation((query, params, callback) => {
      callback(new Error('Input is null'), null);
    });

    const response = await request(app).get('/api/budget/latest');
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Input is null');
  });

  test('Should handle empty list correctly', async () => {
    db.get.mockImplementation((query, params, callback) => {
      callback(null, []);
    });

    const response = await request(app).get('/api/budget/latest');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ monthly_budget: 0 });
  });

  test('Should throw if user is unauthorized', async () => {
    // Assuming there's middleware to check authorization
    const response = await request(app).get('/api/budget/latest').set('Authorization', '');
    expect(response.status).toBe(401);
  });

  test('Should log a warning on failure', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    db.get.mockImplementation((query, params, callback) => {
      callback(new Error('Failure'), null);
    });

    await request(app).get('/api/budget/latest');
    expect(consoleSpy).toHaveBeenCalledWith('Warning: Failure');

    consoleSpy.mockRestore();
  });

  test('Should handle large inputs efficiently', async () => {
    const largeData = new Array(10000).fill({ progress_percentage: 50 });

    db.get.mockImplementation((query, params, callback) => {
      callback(null, largeData);
    });

    const response = await request(app).get('/api/budget/latest');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(10000);
  });
});
