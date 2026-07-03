module.exports = {
  apps: [
    {
      name: "afrikick",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
