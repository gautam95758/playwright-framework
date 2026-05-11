module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    require: ["src/stepdefinition/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: [
      "progress-bar",
      "html:reports/cucumber-report.html"
    ],
    parallel: 1,
    timeout: 60000
  }
};
