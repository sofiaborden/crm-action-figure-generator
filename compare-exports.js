console.log('Checking original generate-card.js:');
try {
  const originalModule = require('./api/generate-card');
  console.log('Type:', typeof originalModule);
  console.log('Is function?', typeof originalModule === 'function');
  console.log('Has stack?', !!originalModule.stack);
  console.log('Keys:', Object.keys(originalModule));
  console.log('Prototype:', Object.getPrototypeOf(originalModule));
} catch (error) {
  console.error('Error with original module:', error);
}

console.log('\nChecking new-generate-card.js:');
try {
  const newModule = require('./api/new-generate-card');
  console.log('Type:', typeof newModule);
  console.log('Is function?', typeof newModule === 'function');
  console.log('Has stack?', !!newModule.stack);
  console.log('Keys:', Object.keys(newModule));
  console.log('Prototype:', Object.getPrototypeOf(newModule));
} catch (error) {
  console.error('Error with new module:', error);
}