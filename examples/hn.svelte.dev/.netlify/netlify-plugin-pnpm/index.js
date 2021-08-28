module.exports = {
  onPreBuild: async ({ utils: { build, run } }) => {
    try {
      await run.command("npm install -g pnpm")
      await run.command("pnpm -w install")
      await run.command("pnpm -w build")
    } catch (error) {
      return build.failBuild(error)
    }
  }
}
