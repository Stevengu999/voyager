module.exports = function(wallaby) {
  return {
    files: [
      "app/src/renderer/**/*",
      "jest.config.js",
      "tasks/*.js",
      "test/unit/helpers/*.js"
    ],

    tests: ["test/unit/specs/**/*.spec.js"],

    env: {
      type: "node",
      runner: "node",
      LOGGING: false,
      ANALYTICS: false,
      NODE_ENV: "testing"
    },

    compilers: {
      "**/*.js": wallaby.compilers.babel(),
      "**/*.vue": require("wallaby-vue-compiler")(wallaby.compilers.babel({}))
    },

    preprocessors: {
      "**/*.vue": file => require("vue-jest").process(file.content, file.path)
    },

    setup: function(wallaby) {
      const jestConfig = require("./jest.config.js")

      wallaby.testFramework.configure(
        Object.assign({}, jestConfig, {
          transform: undefined
        })
      )
    },

    testFramework: "jest",
    debug: true
  }
}
