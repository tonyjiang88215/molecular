module.exports = {
    roots: [
      '<rootDir>/src'
    ],
    transform: {
        '^.+\\.tsx?$': '<rootDir>/node_modules/ts-jest',
    },
    testRegex: '(/__test__/.*)\\.(test|spec)\\.(jsx?|tsx?)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'scss'],
    globals: {
        'ts-jest': {
            tsConfig: '<rootDir>/tsconfig.json',
            isolatedModules: true,
        },
    },
}
