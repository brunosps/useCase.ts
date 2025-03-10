// jest.config.js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'src/**/*.ts',
      '!src/**/*.d.ts',
      '!src/**/*.interface.ts',
      '!src/**/*.type.ts',
    ],
    // Adicione esta configuração para lidar com erros de TypeScript
    transform: {
      '^.+\\.tsx?$': [
        'ts-jest',
        {
          isolatedModules: true, // Isso pode ajudar com alguns erros de tipagem
        },
      ],
    },
  };