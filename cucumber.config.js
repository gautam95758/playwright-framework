module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    require: ["src/stepdefinition/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: [
      "progress-bar",
      "json:reports/test-results.json"
    ],
    parallel: 1,
    timeout: 60000
  }
};
