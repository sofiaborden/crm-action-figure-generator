console.log('Checking for router package...');
try {
  const router = require('router');
  console.log('Router package is installed:', router);
} catch (error) {
  console.log('Router package is not installed or has an error:', error.message);
}

console.log('\nChecking for express.Router...');
try {
  const express = require('express');
  console.log('Express is installed');
  const expressRouter = express.Router;
  console.log('Express.Router is available:', !!expressRouter);
} catch (error) {
  console.log('Express is not installed or has an error:', error.message);
}