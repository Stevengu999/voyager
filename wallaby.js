module.exports = function(wallaby) {
  return {
    files: ["app/src/renderer/**/*", "test/unit/*.spec.js", "package.json"],

    tests: ["test/unit/**/*.spec.js"],

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
      const jestConfig =
        require("./package").jest ||
        require("/Users/billy/cosmos/voyager/jest.config.js")
      jestConfig.transform = {}
      wallaby.testFramework.configure(jestConfig)
    },

    testFramework: "jest",

    debug: true
  }
}
